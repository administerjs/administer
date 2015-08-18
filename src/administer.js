import stampit from 'stampit';
import sequencify from './sequencify';

/**
 * The Default Configuration
 */
const defaultConfiguration = {
  resolveTimeout: 2500
};

const Administer = stampit()
  .refs( defaultConfiguration )

  /**
   * Initialization.
   *
   * Create a new WeakMap to house cached components after first instantiation.
   */
  .init( ({ instance, args }) => {
    instance._container = new WeakMap();

    /**
     * TODO: allow adding mocks through the factory.
     *
     * let A = stampit().refs({ isMockA: false });
     * let MockA = stampit().static({ $provides: A }).refs({ isMockA: true });
     * let adm = Administer( {}, MockA );
     * adm.get( A ).then( a => assert( a.isMockA ) );
     */
  })

  /**
   * Instance Methods.
   */
  .methods({
    /**
     * Retrieve a promise that resolves to the instatiated component or an error.
     *
     * `get` automatically instantiates uncached dependencies listed on the requested component's
     * `$inject` array property, recursively.
     */
    get ( stamp ) {
      return new Promise( ( resolve, reject ) => {
        let promiseToReturn;

        // If this component has not yet been resolved, we create a new instance.
        if ( ! this._container.has( stamp ) ) {

          // If the requested component is a factory, we need to resolve, instantiate, and cache its
          // dependencies before we instantiate and cache the requested component.
          if ( typeof stamp === 'function' ) {
            // This is our record of what we need to instantiate.
            let dependencyMap = new WeakMap();

            let loadDeps = component => {
              // If this component has already been mapped (e.g. it's depended on by two components
              // in the chain), we need do nothing further.
              if ( dependencyMap.has( component ) ) {
                return;
              }

              // Add the component to our map.
              dependencyMap.set( component, [] );

              // If we already have an instance of this component, we need not map its dependencies
              // because, by definition, they too have been cached.
              if ( this._container.has( component ) ) {
                return;
              }

              // If the component isn't a factory, there are no dependencies to process.
              if ( typeof component !== 'function' ) {
                return;
              }

              if ( ! component.$inject ) {
                return;
              } else if ( ! Array.isArray( component.$inject ) ) {
                component.$inject = [ component.$inject ];
              }

              // For each of this component's dependencies, add them to the map if we haven't seen them.
              // Do this recursively.
              component.$inject.forEach( dep => {
                // Ensure the dependency is not undefined
                if ( dep === undefined ) {
                  reject( new Error( `Undefined dependency for ${this._componentName( dep )}` ) );
                }

                dependencyMap.get( component ).push( dep );
                loadDeps( dep );
              });
            }

            // Recursively scan injected dependencies, setting up a dependency tree.
            loadDeps( stamp );

            // Use sequencify to determine the order of execution here.
            let { sequence, missingTasks, recursiveDependencies } = sequencify( dependencyMap, [ stamp ] );

            // Check for circular dependencies
            if ( recursiveDependencies.length ) {
              const deps = recursiveDependencies.map( d => this._componentName( d ) ).join( ', ' );
              reject( new Error( `Component has recursive dependencies: ${deps}` ) );
            }

            // Check for missing dependencies. This probably isn't even possible; it is included here only
            // because sequencify was directly ported, which could have this state.
            /* istanbul ignore if */
            // if ( missingTasks.length ) {
            //   const deps = missingTasks.map( d => this._componentName( d ) ).join( ', ' );
            //   reject( new Error( `Missing dependencies: ${deps}` ) );
            // }

            // Component factories must be *completed* in order since they can be asynchronous, so we
            // reduce the promises in sequence. We start with a dummy promise to keep the code clean.
            promiseToReturn = sequence.reduce( ( promise, dep ) => {
              return promise.then( () => this._instantiate( dep ) );
            }, Promise.resolve( 1 ) )
            ;

          // Else, the requested component is not a factory, so we cache it as is and return a
          // resolved promise with its value.
          } else {
            this._instantiate( stamp );

            promiseToReturn = Promise.resolve( stamp );
          }

        // Else, the component is already cached, so we just return a resolved promise with the cached
        // value.
        } else {
          promiseToReturn = Promise.resolve( this._container.get( stamp ) );
        }

        // Boom.
        resolve( promiseToReturn );
      });
    },

    /**
     * An internal tool for getting a component's name.
     */
    _componentName( component ) {
      return component.displayName || 'UnnamedComponent';
    },

    /**
     * An internal mechanism for instantiating a component.
     *
     * This function *assumes* that the requested component's dependencies are already cached.
     */
    _instantiate ( component ) {
      return new Promise( ( resolve, reject ) => {
        // If we already have this component, just resolve the existing version.
        if ( this._container.has( component ) ) {
          return resolve( this._container.get( component ) );
        }

        // If it's a factory, we must instantiate it, resolve its promise (if applicable), and cache the
        // instance before returning it.
        if ( typeof component === 'function' ) {
          let instance;
          let deps;

          if ( component.$inject ) {
            deps = component.$inject.map( key => this._container.get( key ) );
          } else {
            deps = [];
          }

          if ( stampit.isStamp( component ) ) {
            instance = component.refs({ $inject: deps })( {}, ...deps );
          } else {
            component.prototype.$inject = deps;
            instance = new component( ...deps );
          }

          // If the component takes longer than the specified timeout, reject the promise.
          let timeout = setTimeout( () => {
            reject( new Error( `Component timed out: ${this._componentName( component )}` ) );
          }, this.resolveTimeout );

          // Get the component, even if it's behind a promise, and cache it before resolving the
          // promise with it.
          Promise.resolve( instance )
          .then( instance => {
            // Success, so we don't need that timeout anymore.
            clearTimeout( timeout );

            // Cache the instance.
            this._container.set( component, instance );

            // Resolve it.
            resolve( instance );
          })
          .catch( err =>{
            clearTimeout( timeout );
            reject( err );
          });

        // Else, it's not a factory, so we can just cache it and return a resolved promise with it.
        } else {
          this._container.set( component, component );
          resolve( component );
        }
      });
    },

    /**
     * Register an object as a provider of a specified component (e.g. for mocking).
     *
     * This will overwrite the cached version of a component, if necessary. All subsequent
     * instantiations that depend on the specified component will instead receive the passed object.
     *
     * TODO(jdm): this should be able to accept factories in addition to objects.
     */
    provide ( key, value ) {
      this._container.set( key, value );
    },

    /**
     * Blow out the existing WeakMap, effectively clearing the cache.
     */
    clear () {
      this._container = new WeakMap();
    }
  })
  ;

export default Administer;


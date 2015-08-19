'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var _bind = Function.prototype.bind;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _stampit = require('stampit');

var _stampit2 = _interopRequireDefault(_stampit);

var _sequencify2 = require('./sequencify');

var _sequencify3 = _interopRequireDefault(_sequencify2);

/**
 * The Default Configuration
 */
var defaultConfiguration = {
  resolveTimeout: 2500
};

var Administer = (0, _stampit2['default'])().refs(defaultConfiguration)

/**
 * Initialization.
 *
 * Create a new WeakMap to house cached components after first instantiation.
 */
.init(function (_ref) {
  var instance = _ref.instance;
  var args = _ref.args;

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
  get: function get(stamp) {
    var _this = this;

    return new Promise(function (resolve, reject) {
      var promiseToReturn = undefined;

      // If this component has not yet been resolved, we create a new instance.
      if (!_this._container.has(stamp)) {

        // If the requested component is a factory, we need to resolve, instantiate, and cache its
        // dependencies before we instantiate and cache the requested component.
        if (typeof stamp === 'function') {
          (function () {
            // This is our record of what we need to instantiate.
            var dependencyMap = new WeakMap();

            var loadDeps = function loadDeps(component) {
              // If this component has already been mapped (e.g. it's depended on by two components
              // in the chain), we need do nothing further.
              if (dependencyMap.has(component)) {
                return;
              }

              // Add the component to our map.
              dependencyMap.set(component, []);

              // If we already have an instance of this component, we need not map its dependencies
              // because, by definition, they too have been cached.
              if (_this._container.has(component)) {
                return;
              }

              // If the component isn't a factory, there are no dependencies to process.
              if (typeof component !== 'function') {
                return;
              }

              if (!component.$inject) {
                return;
              } else if (!Array.isArray(component.$inject)) {
                component.$inject = [component.$inject];
              }

              // For each of this component's dependencies, add them to the map if we haven't seen them.
              // Do this recursively.
              component.$inject.forEach(function (dep) {
                // Ensure the dependency is not undefined
                if (dep === undefined) {
                  reject(new Error('Undefined dependency for ' + _this._componentName(dep)));
                }

                dependencyMap.get(component).push(dep);
                loadDeps(dep);
              });
            };

            // Recursively scan injected dependencies, setting up a dependency tree.
            loadDeps(stamp);

            // Use sequencify to determine the order of execution here.

            var _sequencify = (0, _sequencify3['default'])(dependencyMap, [stamp]);

            var sequence = _sequencify.sequence;
            var missingTasks = _sequencify.missingTasks;
            var recursiveDependencies = _sequencify.recursiveDependencies;

            // Check for circular dependencies
            if (recursiveDependencies.length) {
              var deps = recursiveDependencies.map(function (d) {
                return _this._componentName(d);
              }).join(', ');
              reject(new Error('Component has recursive dependencies: ' + deps));
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
            promiseToReturn = sequence.reduce(function (promise, dep) {
              return promise.then(function () {
                return _this._instantiate(dep);
              });
            }, Promise.resolve(1));

            // Else, the requested component is not a factory, so we cache it as is and return a
            // resolved promise with its value.
          })();
        } else {
            _this._instantiate(stamp);

            promiseToReturn = Promise.resolve(stamp);
          }

        // Else, the component is already cached, so we just return a resolved promise with the cached
        // value.
      } else {
          promiseToReturn = Promise.resolve(_this._container.get(stamp));
        }

      // Boom.
      resolve(promiseToReturn);
    });
  },

  /**
   * An internal tool for getting a component's name.
   */
  _componentName: function _componentName(component) {
    return component.displayName || 'UnnamedComponent';
  },

  /**
   * An internal mechanism for instantiating a component.
   *
   * This function *assumes* that the requested component's dependencies are already cached.
   */
  _instantiate: function _instantiate(component) {
    var _this2 = this;

    return new Promise(function (resolve, reject) {
      // If we already have this component, just resolve the existing version.
      if (_this2._container.has(component)) {
        return resolve(_this2._container.get(component));
      }

      // If it's a factory, we must instantiate it, resolve its promise (if applicable), and cache the
      // instance before returning it.
      if (typeof component === 'function') {
        (function () {
          var instance = undefined;
          var deps = undefined;

          if (component.$inject) {
            deps = component.$inject.map(function (key) {
              return _this2._container.get(key);
            });
          } else {
            deps = [];
          }

          if (_stampit2['default'].isStamp(component)) {
            instance = component.refs({ $inject: deps }).apply(undefined, [{}].concat(_toConsumableArray(deps)));
          } else {
            component.prototype.$inject = deps;
            instance = new (_bind.apply(component, [null].concat(_toConsumableArray(deps))))();
          }

          // If the component takes longer than the specified timeout, reject the promise.
          var timeout = setTimeout(function () {
            reject(new Error('Component timed out: ' + _this2._componentName(component)));
          }, _this2.resolveTimeout);

          // Get the component, even if it's behind a promise, and cache it before resolving the
          // promise with it.
          Promise.resolve(instance).then(function (instance) {
            // Success, so we don't need that timeout anymore.
            clearTimeout(timeout);

            // Cache the instance.
            _this2._container.set(component, instance);

            // Resolve it.
            resolve(instance);
          })['catch'](function (err) {
            clearTimeout(timeout);
            reject(err);
          });

          // Else, it's not a factory, so we can just cache it and return a resolved promise with it.
        })();
      } else {
          _this2._container.set(component, component);
          resolve(component);
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
  provide: function provide(key, value) {
    this._container.set(key, value);
  },

  /**
   * Blow out the existing WeakMap, effectively clearing the cache.
   */
  clear: function clear() {
    this._container = new WeakMap();
  }
});

exports['default'] = Administer;
module.exports = exports['default'];
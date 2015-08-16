import stampit from 'stampit';
import Administer from './';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

chai.use( chaiAsPromised );

describe( 'Administer', function () {
  let A = stampit().static({ displayName: 'A' }).refs({ isA: true });
  let O = { displayName: 'O' };
  let B = stampit().static({ displayName: 'B', $inject: [ A, O ] }).refs({ isB: true })
    .init( ({ instance, args }) => {
      [ instance.A, instance.O ] = args;
    });
  let C = stampit().static({ displayName: 'C', $inject: [ B ] })
    .init( ({ instance, args }) => {
      [ instance.B ] = args;
    });

  describe( 'factory', function () {
    it( 'should be a function', function () {
      expect( Administer ).to.be.a.function;
    });

    describe( 'given a configuration', function () {
      it( 'should store the configuration', function () {
        let resolveTimeout = 100;
        expect( Administer({ resolveTimeout }) ).to.have.property( 'resolveTimeout', resolveTimeout );
      });
    });
  });

  describe( 'get()', function () {
    beforeEach( function () {
      this.adm = Administer();
    });

    it( 'should return a promise', function () {
      expect( this.adm.get( A ) ).to.have.property( 'then' ).which.is.a.function;
    });

    describe( 'given a factory', function () {
      describe( 'with no depencencies', function () {
        it( 'should resolve successfully', function () {
          return expect( this.adm.get( A ) ).to.be.fulfilled;
        });

        it( 'should resolve with an instance of the component', function () {
          return expect( this.adm.get( A ) ).to.eventually.have.property( 'isA' );
        });

        it( 'should cache the component after the first call', function () {
          return this.adm.get( A ).then( a => {
            return this.adm.get( A ).then( a2 => {
              expect( a2 ).to.equal( a );
            });
          });
        });
      });

      describe( 'with 1-level dependencies', function () {
        it( 'should resolve successfully', function () {
          return expect( this.adm.get( B ) ).to.be.fulfilled;
        });

        it( 'should pass injected components to factory', function () {
          return this.adm.get( B ).then( b => {
            expect( b.A ).to.have.property( 'isA' );
            expect( b.O ).to.have.property( 'displayName' );
          });
        });

        it( 'should use a cached instance for dependencies', function () {
          return this.adm.get( A ).then( a => {
            return this.adm.get( B ).then( b => {
              expect( b.A ).to.equal( a );
            });
          });
        });

        it( 'should cache dependencies', function () {
          return this.adm.get( B ).then( b => {
            return this.adm.get( A ).then( a => {
              expect( b.A ).to.equal( a );
            });
          });
        });
      });

      describe( 'with 2-level dependencies', function () {
        it( 'should resolve successfully', function () {
          return expect( this.adm.get( B ) ).to.be.fulfilled;
        });

        it( 'should pass injected components to factory', function () {
          return this.adm.get( C ).then( c => {
            expect( c.B ).to.have.property( 'isB' );
            expect( c.B ).to.have.deep.property( 'A.isA' );
          });
        });

        it( 'should use a cached instance for dependencies', function () {
          return this.adm.get( B ).then( b => {
            return this.adm.get( C ).then( c => {
              expect( c.B ).to.equal( b );
            });
          });
        });

        it( 'should cache dependencies', function () {
          return this.adm.get( C ).then( c => {
            return this.adm.get( B ).then( b => {
              expect( c.B ).to.equal( b );
            });
          });
        });
      });

      describe( 'that returns a promise', function () {
        let P = stampit().init( () => Promise.resolve({ isP: true }) );
        let Q = stampit().static({ displayName: 'Q', $inject: [ P ] })
          .init( ({ instance, args }) => {
            [ instance.P ] = args;
          });

        it( 'should resolve successfully', function () {
          return expect( this.adm.get( P ) ).to.eventually.have.property( 'isP' );
        });

        describe( 'as a dependency', function () {
          it( 'should pass resolved promises to factory', function () {
            return this.adm.get( Q ).then( q => {
              expect( q.P ).to.have.property( 'isP' );
            });
          });
        });

        describe( 'which rejects', function () {
          it( 'should pass on the rejection', function () {
            let err = new Error();
            let Reject = stampit().init(() => Promise.reject( err ) );

            return expect( this.adm.get( Reject ) ).to.be.rejectedWith( err );
          });
        });

        describe( 'that exceeds the timeout', function () {
          let DelayedComponent = function () {
            return new Promise( ( resolve, reject ) => setTimeout( () => resolve( true ), 20 ) );
          };

          beforeEach( function () {
            this.adm = Administer({ resolveTimeout: 10 });
            this.clock = sinon.useFakeTimers();
          });

          afterEach( function () {
            this.clock.restore();
          });

          it( 'should reject the promise', function () {
            let promise = this.adm.get( DelayedComponent );
            this.clock.tick( 15 );

            // https://github.com/cjohansen/Sinon.JS/issues/738#issuecomment-129460050
            this.clock.restore();

            return expect( promise ).to.be.rejectedWith( /timed out/ );
          });
        });
      });

      describe( 'with undefined dependencies', function () {
        let U = stampit().static({ $inject: [ undefined ] });

        it( 'should reject with an error', function () {
          return expect( this.adm.get( U ) ).to.be.rejectedWith( /undefined/ );
        });
      });

      describe( 'with a single non-array dependency', function () {
        it( 'should resolve with the component', function () {
          let NA = stampit().static({ $inject: A }).init(({instance, args}) => {
            [ instance.a ] = args;
          });

          return expect( this.adm.get( NA ) ).to.eventually.have.deep.property( 'a.isA' );
        });
      });

      describe( 'with recursive dependencies', function () {
        it( 'should reject with an error', function () {
          let A = stampit().static({ displayName: 'A' });
          let B = stampit().static({ displayName: 'B', $inject: [ A ] })
          A.$inject = [ B ];

          return expect( this.adm.get( A ) ).to.be.rejectedWith( /recursive/ );
        });
      });
    });

    describe( 'given an object', function () {
      it( 'should resolve successfully', function () {
        return expect( this.adm.get( O ) ).to.be.fulfilled;
      });

      it( 'should resolve with the same object', function () {
        return expect( this.adm.get( O ) ).to.eventually.equal( O );
      });
    });
  });

  describe( 'provide()', function () {
    let mockA = { isMockA: true };

    beforeEach( function () {
      this.adm = Administer();
    });

    it( 'should register an alternative for a component', function () {
      this.adm.provide( A, mockA );
      return expect( this.adm.get( A ) ).to.eventually.have.property( 'isMockA' );
    });

    it( 'should use a cached alternative for component dependencies', function () {
      this.adm.provide( A, mockA );
      return this.adm.get( A ).then( a => {
        return this.adm.get( B ).then( b => {
          expect( b.A ).to.have.property( 'isMockA' );
        });
      });
    });
  });

  describe( 'clear()', function () {
    beforeEach( function () {
      this.adm = Administer();
    });

    it( 'should clear out cached components', function () {
      return this.adm.get( A ).then( a => {
        this.adm.clear();
        return this.adm.get( A ).then( a2 => {
          expect( a ).to.not.equal( a2 );
        });
      });
    });
  });
});


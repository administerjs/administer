import stampit from 'stampit';
import test from 'blue-tape';
import lolex from 'lolex';
import Administer from './administer';

const A = stampit().static({ displayName: 'A' }).refs({ isA: true });
const O = { displayName: 'O' };
const B = stampit().static({ displayName: 'B', $inject: [ A, O ] }).refs({ isB: true })
  .init( ({ instance, args }) => {
    [ instance.A, instance.O ] = args;
  });
const C = stampit().static({ displayName: 'C', $inject: [ B ] }).refs({ isC: true })
  .init( ({ instance, args }) => {
    [ instance.B ] = args;
  });
const P = stampit().init( () => Promise.resolve({ isP: true }) );
const Q = stampit().static({ displayName: 'Q', $inject: [ P ] })
  .init( ({ instance, args }) => {
    [ instance.P ] = args;
  });

test( 'Administer', t => {
  t.plan( 2 );
  t.equal( typeof Administer, 'function', 'should be a function' );

  const config = { resolveTimeout: 100 };
  const adm = new Administer( config );

  t.equal( adm.resolveTimeout, config.resolveTimeout, 'should merge props passed in' );
});

test( 'adm.get() with a factory with no deps', t => {
  t.plan( 3 );

  const adm = Administer();
  const promise = adm.get( A );
  let a;

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( comp => {
    a = comp;

    t.ok( a.isA, 'should resolve to an instance of the factory' );

    return adm.get( A );
  })
  .then( a2 => {
    t.equal( a, a2, 'should cache the instance after the first call' );
  });
});

test( 'adm.get() with a factory with 1-level deps', t => {
  t.plan( 7 );

  const adm = Administer();
  const promise = adm.get( B );
  let b;

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( comp => {
    b = comp;

    t.ok( b.isB, 'should resolve to an instance of the factory' );
    t.ok( b.A.isA, 'should pass injected components to the factory' );
    t.equal( b.O.displayName, 'O', 'should pass injected components to the factory' );

    t.ok( b.$inject instanceof Array, 'should create an $inject property' );
    t.equal( b.A, b.$inject[ 0 ], 'should put dependencies inside $inject' );

    return adm.get( B );
  })
  .then( b2 => {
    t.equal( b, b2, 'should cache the instance after the first call' );
  });
});

test( 'adm.get() with a factory with 2-level deps', t => {
  t.plan( 5 );

  const adm = Administer();
  const promise = adm.get( C );
  let c;

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( comp => {
    c = comp;

    t.ok( c.isC, 'should resolve to an instance of the factory' );
    t.ok( c.B.A.isA, 'should pass injected components to the factory' );
    t.equal( c.B.O.displayName, 'O', 'should pass injected components to the factory' );

    return adm.get( C );
  })
  .then( c2 => {
    t.equal( c, c2, 'should cache the instance after the first call' );
  });
});

test( 'adm.get() caching', t => {
  t.plan( 2 );

  const adm = Administer();
  let a;
  let b;

  return adm.get( B ).then( comp => {
    b = comp;
    return adm.get( A );
  })
  .then( comp => {
    a = comp;
    t.equal( b.A, a, 'should cache dependencies' );

    return adm.get( B.refs({ newB: true }) );
  })
  .then( b2 => {
    t.equal( b2.A, a, 'should get component deps from cache' );
  });
});

test( 'adm.get() with a promise factory', t => {
  t.plan( 3 );

  const adm = Administer();
  const promise = adm.get( P );
  let p;

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( comp => {
    p = comp;

    t.ok( p.isP, 'should resolve to an instance of the factory' );

    return adm.get( P );
  })
  .then( p2 => {
    t.equal( p, p2, 'should cache the instance after the first promise call' );
  });
});

test( 'adm.get() with a factory that has a promise factory as a dependency', t => {
  t.plan( 1 );

  const adm = Administer();

  return adm.get( Q )
  .then( q => {
    t.ok( q.P.isP, 'should resolve to an instance of the factory' );
  });
});

test( 'adm.get() with a promise factory that rejects', t => {
  t.plan( 1 );

  const err = new Error();
  const Reject = stampit().init(() => Promise.reject( err ) );
  const adm = Administer();

  return adm.get( Reject )
  .then( () => t.notOk( true, 'should have rejected the promise' ) )
  .catch( e => {
    t.equal( e, err, 'should reject the promise' );
  });
});

test( 'adm.get() with a promise that does not resolve before resolveTimeout', t => {
  t.plan( 1 );

  const DelayedComponent = function () {
    return new Promise( resolve => setTimeout( () => resolve( true ), 20 ) );
  };
  const adm = new Administer({ resolveTimeout: 10 });
  const clock = lolex.install();

  clock.tick( 15 );
  const promise = adm.get( DelayedComponent );
  clock.uninstall();

  return promise
  .then( () => t.notOk( true, 'should have rejected the promise' ) )
  .catch( e => {
    t.ok( e.toString().match( /timed out/ ), 'should reject the promise' );
  });
});

test( 'adm.get() with undefined dependencies', t => {
  t.plan( 1 );

  const U = stampit().static({ $inject: [ undefined ] });
  const adm = Administer();

  return adm.get( U )
  .then( () => t.notOk( true, 'should have rejected the promise' ) )
  .catch( e => {
    t.ok( e.toString().match( /undefined/ ), 'should reject the promise' );
  });
});

test( 'adm.get() with a factory with a non-array dependency', t => {
  t.plan( 2 );

  const adm = Administer();
  const NA = stampit().static({ $inject: A }).init( ({ instance, args }) => {
    [ instance.A ] = args;
  });
  const promise = adm.get( NA );

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( na => {
    t.ok( na.A.isA, 'should pass injected components to the factory' );
  });
});

test( 'adm.get() with recursive dependencies', t => {
  t.plan( 1 );

  const A = stampit().static({ displayName: 'A' });
  const B = stampit().static({ displayName: 'B', $inject: [ A ] });
  A.$inject = [ B ];
  const adm = Administer();

  return adm.get( A )
  .then( () => t.notOk( true, 'should have rejected the promise' ) )
  .catch( e => {
    t.ok( e.toString().match( /recursive/ ), 'should reject the promise' );
  });
});

test( 'adm.get() with an ES6 class', t => {
  t.plan( 5 );

  const adm = Administer();
  class Factory {
    static get $inject () {
      return [ A ];
    }

    constructor ( a ) {
      this.isFactory = true;
      this.a = a;
    }
  }
  const promise = adm.get( Factory );

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( f => {
    t.ok( f.isFactory, 'should resolve with an instance from the factory' );
    t.ok( f.a.isA, 'should pass dependencies as arguments to the constructor' );

    t.ok( f.$inject instanceof Array, 'should create $inject on the prototype' );
    t.equal( f.$inject[ 0 ], f.a, 'should put dependencies on this.$inject' );
  });
});

test( 'adm.get() with a non-stamp factory', t => {
  t.plan( 5 );

  const adm = Administer();
  const Factory = function ( a ) {
    this.isFactory = true;
    this.a = a;
  };
  Factory.$inject = [ A ];
  const promise = adm.get( Factory );

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( f => {
    t.ok( f.isFactory, 'should resolve with an instance from the factory' );
    t.ok( f.a.isA, 'should pass dependencies as arguments' );

    t.ok( f.$inject instanceof Array, 'should create $inject on the prototype' );
    t.equal( f.$inject[ 0 ], f.a, 'should put dependencies on this.$inject' );
  });
});

test( 'adm.get() with an object', t => {
  t.plan( 2 );

  const adm = Administer();
  const promise = adm.get( O );

  t.equal( typeof promise.then, 'function', 'should return a promise' );

  return promise.then( o => {
    t.equal( o, O, 'should resolve with the same object' );
  });
});

test( 'adm.provide() should pre-set an instance for a factory', t => {
  t.plan( 2 );

  const adm = Administer();
  const mockA = { isMockA: true };

  adm.provide( A, mockA );
  return adm.get( A )
  .then( a => {
    t.ok( a.isMockA, 'should resolve to the provided object' );
    return adm.get( B );
  })
  .then( b => {
    t.ok( b.A.isMockA, 'should cache the provided object' );
  });
});

test( 'adm.provide() should pre-set an instance for use as a dependency', t => {
  t.plan( 1 );

  const adm = Administer();
  const mockA = { isMockA: true };

  adm.provide( A, mockA );
  return adm.get( B ).then( b => {
    t.ok( b.A.isMockA, 'should inject the provided object' );
  });
});

test( 'adm.clear() should remove any cached instances', t => {
  t.plan( 1 );

  const adm = Administer();
  const promise = adm.get( A );
  let a;

  return promise.then( comp => {
    a = comp;
    adm.clear();
    return adm.get( A );
  })
  .then( a2 => {
    t.notEqual( a, a2, 'should return a new instance' );
  });
});


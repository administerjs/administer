import sequencify from './sequencify';
import test from 'blue-tape';

const tasks = new Map( [
  [ 'a', [] ],
  [ 'b', [ 'a' ] ],
  [ 'c', [ 'a' ] ],
  [ 'd', [ 'b', 'c' ] ],
  [ 'e', [ 'f' ] ],
  [ 'f', [ 'e' ] ],
  [ 'g', [ 'g' ] ],
] );

const theTest = function ( source, expected, t ) {
  t.plan( 3 );
  // act
  const actual = sequencify( tasks, source.split( ',' ) );

  // assert
  t.equal( actual.sequence.join( ',' ), expected );
  t.equal( actual.missingTasks.length, 0 );
  t.equal( actual.recursiveDependencies.length, 0 );
};

const theTestError = function ( source ) {
  // act
  const actual = sequencify( tasks, source.split( ',' ) );

  // assert.end by caller
  return actual;
};

test( 'sequencify( a ) -> a', t => {
  theTest( 'a', 'a', t );
});
test( 'sequencify( a, a ) -> a', t => {
  theTest( 'a,a', 'a', t );
});
test( 'sequencify( c ) -> a,c', t => {
  theTest( 'c', 'a,c', t );
});
test( 'sequencify( b ) -> a,b', t => {
  theTest( 'b', 'a,b', t );
});
test( 'sequencify( c,b ) -> a,c,b', t => {
  theTest( 'c,b', 'a,c,b', t );
});
test( 'sequencify( b,c ) -> a,b,c', t => {
  theTest( 'b,c', 'a,b,c', t );
});
test( 'sequencify( b,a ) -> a,b', t => {
  theTest( 'b,a', 'a,b', t );
});
test( 'sequencify( d ) -> a,b,c,d', t => {
  theTest( 'd', 'a,b,c,d', t );
});
test( 'sequencify( c,d ) -> a,c,b,d', t => {
  theTest( 'c,d', 'a,c,b,d', t );
});
test( 'sequencify( b,d ) -> a,b,c,d', t => {
  theTest( 'b,d', 'a,b,c,d', t );
});
test( 'sequencify( e ) -> recursive', t => {
  // arrange
  let i;
  const expectedRecursionList = [ 'e', 'f', 'e' ];

  // act
  const actual = theTestError( 'e' );

  // assert
  t.equal( actual.recursiveDependencies.length, 1 );
  t.equal( actual.recursiveDependencies[ 0 ].length, expectedRecursionList.length );
  for (i = 0; i < expectedRecursionList.length; i++) {
    t.equal( actual.recursiveDependencies[ 0 ][ i ], expectedRecursionList[ i ] );
  }

  t.end();
});
test( 'sequencify( g ) -> recursive', t => {
  // arrange
  let i;
  const expectedRecursionList = [ 'g', 'g' ];

  // act
  const actual = theTestError( 'g' );

  // assert
  t.equal( actual.recursiveDependencies.length, 1 );
  t.equal( actual.recursiveDependencies[ 0 ].length, expectedRecursionList.length );
  for (i = 0; i < expectedRecursionList.length; i++) {
    t.equal( actual.recursiveDependencies[ 0 ][ i ], expectedRecursionList[ i ] );
  }

  t.end();
});
test( 'sequencify( h ) -> missing', t => {
  t.plan( 2 );

  // act
  const actual = theTestError( 'h' );

  // assert
  t.equal( actual.missingTasks.length, 1 );
  t.equal( actual.missingTasks[ 0 ], 'h' );

});


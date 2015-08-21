import test from 'blue-tape';
import stampit from 'stampit';
import Factory from './factory';

test( 'Factory factory', t => {
  t.plan( 4 );

  const ComponentB = Factory( 'ComponentB' );
  const ComponentA = Factory( 'ComponentA', [ ComponentB ] );
  const ComponentC = Factory();

  t.ok( stampit.isStamp( ComponentB ), 'should return a stamp' );
  t.equals( ComponentB.displayName, 'ComponentB', 'should set the component displayName' );
  t.deepEquals( ComponentA.$inject, [ ComponentB ], 'should set the dependencies to $inject' );

  t.equals( ComponentC.displayName, 'Factory', 'should have a default displayName of "Factory"' );
});


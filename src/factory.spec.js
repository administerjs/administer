import test from 'blue-tape';
import stampit from 'stampit';
import Factory from './factory';

test( 'Factory factory', t => {
  t.plan( 3 );

  const ComponentB = Factory( 'ComponentB' );
  const ComponentA = Factory( 'ComponentA', [ ComponentB ] );

  t.ok( stampit.isStamp( ComponentB ), 'should return a stamp' );
  t.equals( ComponentB.displayName, 'ComponentB', 'should set the component displayName' );
  t.deepEquals( ComponentA.$inject, [ ComponentB ], 'should set the dependencies to $inject' );
});


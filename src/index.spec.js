import test from 'blue-tape';
import Administer from './administer';
import module from './';

test( 'default module', t => {
  t.plan( 1 );
  t.equal( module, Administer, 'should export the Administer factory' );
});


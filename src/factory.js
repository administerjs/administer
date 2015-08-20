import stampit from 'stampit';

const Factory = function Factory ( displayName = 'Factory', $inject = [] ) {
  return stampit()
    .static({ displayName, $inject });
};

export default Factory;


# Administer: Minimalist DI

Administer is a minimalist dependency injection framework for javascript projects that fully
supports [stamps](https://github.com/stampit-org/stampit) (and ES6 classes and plain javascript
functions). Check out the below [example](#example) to quickly see how it's used, and then read [the
full API docs](docs/api.md).

## Yet Another DI Framework?

In short, yes. After trying many components, [@joshdmiller](https://github.com/joshdmiller) couldn't
find anything that precisely met his requirements, and so created Administer.

Specifically, Administer has the following design goals:

- Be lightweight and minimalist with as few as possible dependencies.
- Provide a little bit of magic for stamps, but don't shove it down anyone's throat.
- Allow swapping components at runtime to allow easy mocking.
- Use factories instead of frail string names to declare dependencies.
- Don't require manually registering components with the injector.
- *Coming soon*. Work in Node and the browser.

## Example

Assuming we have components `A` and `B`:

```js
// a.js
import stampit from 'stampit';
import B from './b';

const A = stampit()
.static({ $inject: [ B ] })
.init( ({ instance, args }) => {
  let [ instance.b ] = args;
})
.methods({
  doSomething () {
    return this.b.doIt();
  }
});

export default A;

// b.js
import stampit from 'stampit';

const B = stampit()
.methods({
  doIt () {
    console.log( 'Hello!' );
  }
});

export default B;
```

You can get a new injector by calling `Administer()` and then fetching the component you want:

```js
import A from './a';
import Administer from 'administer';

const adm = Administer({/* config */});
adm.get( A ).then( a => {
  a.doSomething();

  // and B is accessible on a because of the `init` above:
  a.b.doIt();
});
```

Using dependency injection is just that simple! But let's say you have unit tests of `A` that you
want to test in isolation - that is to say, without `B`. You can simple define a mock, tell the
injector to use it with a call to `provide()`, and then test your component:

```js
import A from './a';
import B from './b';

const mockB = {
  doIt () {
    console.log( 'mock!' );
  }
})
;

const adm = Administer();
adm.provide( B, mockB );
adm.get( A )
.then( function ( a ) {
  a.doSomething();
  // -> 'mock!'
});
```

This is the core of the dependency injection framework. You create factories for the components,
using either StampIt, as above, or ES6 classes or plain javascript functions. Then you specify
dependencies straight away using an `$inject` property on the component factory. Finally, you ask the
injector for an instance of the component you need and it will recursively resolve all dependencies,
ensuring all components who request a particular component get precisely the same instance.

Check out the [API documentation](docs/api.md) for more information. And feel free to contribute!


# Administer API Documentation

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Administer API Documentation](#administer-api-documentation)
  - [Administer( Object config ) : Administer](#administer-object-config---administer)
- [The Administer Object](#the-administer-object)
  - [adm.get( Object|Function component ) : Promise](#admget-objectfunction-component---promise)
    - [Errors](#errors)
  - [adm.provide( Object component, Object mock )](#admprovide-object-component-object-mock-)
  - [adm.clear()](#admclear)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

Throughout this document, `adm` is assumed to be the Administer instance and
[ES2015 syntax](http://babeljs.io/docs/learn-es2015/) is used, but neither is required.

## Administer( Object config ) : Administer

A factory for creating new instances of the dependency injection container. Unless you really know
what you are doing, this should not be called more than once in your application.

**Example:**

```js
let adm = Administer({ resolveTimeout: 2500 });
export default adm;
```

# The Administer Object

Once you have an instance of Administer, the following methods are available.

## adm.get( Object|Function component ) : Promise

Returns a promise to resolve the requested component.

- **component** *Object*|*Function*. An object or an object factory that we want Administer to
  manage for us.

If an object is provided, Administer will simply cache it and resolve the promise with the provided
object.

If a function is provided, it is assumed to be a factory that *could* have dependencies. If the
factory has an array property called `$inject`, Administer will create instances of each component
and all of their dependencies, recursively, before calling the factory method, caching the
instance it returns, and resolving the promise with that instance.

Factory functions can either be ES6 classes, constructor functions, plain javascript functions, or
[Stampit](https://github.com/stampit-org/stampit) stamps. Non-stamps are all treated identically and
run with the `new` keyword, while stamps are simply called.

Factory functions can optionally have dependencies that need to be injected:

```js
// Plain JavaScript
function MyComponent ( a, b ) {
  // ...
}
MyComponent.$inject = [ ComponentA, ComponentB ];

// ES6 Class
class MyComponent {
  static get $inject () {
    return [ ComponentA, ComponentB ];
  }

  constructor ( a, b ) {
    // ...
  }
}

// Stamp
const MyComponent = stampit()
  .static({ $inject: [ ComponentA, ComponentB ] })
  .init( ({ instance, args }) => {
    let [ a, b ] = args;
  })
  ;
```

These dependencies, if not cached, will be instantiated before Administer calls the component
factory. Regardless of caching, Administer will pass the instances to the factory.

Component factories can return anything and Administer will cache it. However, if the factory
returns a promise, it will be resolved and Administer will cache whatever it returns. This allows
you to use factories to create database connections (and so forth) without requiring an intermediate
callback or promise:

```js
const Database = function ( config ) {
  return databaseConnectionPromise;
};
Database.$inject = [ Configuration ];

adm.get( Database ).then( db => {
  db.query();
});
```

### Errors

The promise returned by `get()` can reject for several reasons, including if an uncaught error is
thrown by the factory. In addition, any factories that return promises that eventually reject will
see that error passed through unchanged.

Lastly, there are three cases where dependency resolution fails, so `get()` will reject with an
error.  The first is if any value within the `$inject` array is `undefined` (though Administer will
treat all other values, including `null`, as a success). The second is if there are recursive
dependencies (e.g. `A -> B -> C -> A`), which Administer cannot resolve.

Third, Administer will not wait indefinitely for promises to resolve. By default, `get()` will
reject with an error if any dependency anywhere in the chain takes longer than 2500ms to resolve.
This value is configurable by passing a configuration to the Administer factory with a different
integer value, for example:

```js
// reject after only 10ms
const adm = Administer({ resolveTimeout: 10 });
```

## adm.provide( Object component, Object mock )

Provide a mock object that will represent a component in all future requests.

* **component** *Object*. The component to mock out.
* **mock** *Object*. An object to use instead of an instance of the component.

This allows you to specify a substitute for a component such that any future request for that
component will return this object. This is useful for unit testing.

**Example:**

```js
import Administer from 'administer';
import A from './a';
import B from './b';

const adm = Administer();
const MockA = {
  someFunction () {
    return 'mock';
  }
};

adm.get( B ).then( b => {
  // assuming B $injects A and saves it as `this.a`
  b.a.someFunction();
  // -> 'mock'
});
```

## adm.clear()

Empties the entire cache.

Calling the `clear` method ensures that Administer will instantiate the next component requested
(and all of its dependencies) rather than using any previous version. This is helpful for unit
testing.

**Example:**

```js
const adm = Administer();

adm.get( A ).then( a => {
  adm.clear();

  return adm.get( A );
})
.then( a2 => {
  // a !== a2
});
```


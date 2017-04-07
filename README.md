[![CircleCI](https://circleci.com/gh/pcardune/redux-firebase-mirror.svg?style=svg)](https://circleci.com/gh/pcardune/redux-firebase-mirror)
[![codecov](https://codecov.io/gh/pcardune/redux-firebase-mirror/branch/master/graph/badge.svg)](https://codecov.io/gh/pcardune/redux-firebase-mirror)

# redux-firebase-mirror
A library to help you easily mirror firebase data inside a redux store, and use
that data inside a react application

## Table of Contents

1. [Installation](#installation)
1. [Set Up](#set-up)
1. [API](#api)

## Installation

```
npm install redux-firebase-mirror redux redux-thunk
```

### Peer Dependencies

`redux-firebase-mirror` has the following peer and optional dependencies:
* `redux` - this should be obvious. This library is designed to work with redux
  so you need to have it installed for this to be of any use.
* `redux-thunk` - You must set up your redux store with
  the [redux-thunk middleware](https://www.npmjs.com/package/redux-thunk) which
  this library uses to execute asynchronous redux actions.

## Set Up

Data from firebase will be mirrored in your redux state tree. For this to work,
you must incorporate `redux-firebase-mirror`'s redux reducer into your project's
top-level redux reducer.

Use the `combineReducers()` utility function from `redux` to place the reducer
under the `firebaseMirror` key. Here is an example of what this might look like:

```jsx
import reduxFirebaseMirror from 'redux-firebase-mirror';
import {combineReducers, createStore} from 'redux';
import thunkMiddleware from 'redux-thunk';

const firebaseMirror = reduxFirebaseMirror();

const store = createStore(
  combineReducers({
    firebaseMirror,
    // your applications other reducers here...
  }),
  applyMiddleware(thunkMiddleware)
);
```

## API

### Configuration

#### reduxFirebaseMirror()

This function is used to initialize and configure the `redux-firebase-mirror` module and get a reducer to
incorporate in your applications exisiting redux store. It takes an optional `config` object for customizing behavior.

Param         | Type | Description
--------------|------|-----------------------------------------------
`config`        | `Object` | Optional configuration object. See options below.
`config.getFirebaseState` | `Function` | Optional selector function for getting the state used by `redux-firebase-mirror`. If not specified, will default to `(state) => state.firebaseMirror;`
`config.persistToLocalStorage` | `Object` | A config object for persisting the mirror to local storage. If not provided, no data will be persisted. See below for the specific options
`config.persistToLocalStorage.storage` | `localStorage\|sessionStorage` | Optionally specify a custom storage system. Defaults to using `localStorage`. Can be any object which implements the same API as `localStorage`.
`config.persistToLocalStorage.storagePrefix` | `string` | Optionally specify a prefix to use for all keys given to localStorage. Defaults to `"firebase"`.

returns: a redux reducer function

### Action Creators

The following action creators can be used to control what parts of the firebase database are being mirrored.

#### subscribeToValues(paths)

Registers listeners for firebase `value` events at the specified paths. Whenever the value changes in firebase, the redux store will be updated.

Param | Type | Description
------|------|------------
`paths` | `string[]` | The array of firebase database paths to subscribe to.

returns: nothing

Example:

```js
store.dispatch(subscribeToValues([
  `/profiles/${userId}`,
  `profilePics/${userId}/square`
]));
```

#### unsubscribeFromValues(paths)

Stops listening to firebase `value` events at the specified paths. The mirror will no longer be updated at this location unless there is another listener at a higher path. Note that whatever data was already mirrored will still be available in the redux state.

Param | Type | Description
------|------|------------
`paths` | `string[]` | The array of firebase database paths to subscribe to.

returns: nothing

Example:

```js
store.dispatch(unsubscribeFromValues([
  `/profiles/${userId}`,
  `profilePics/${userId}/square`
]));
```

#### fetchValues(paths, callback)

Mirrors the values at the specified paths in the firebase database into your redux store _once_. The mirrored data will not continue to sync with firebase. 

Param | Type | Description
------|------|------------
`paths` | `string[]` | The array of firebase database paths to fetch.
`callback` | `[Function]` | Optional callback function which will be called once the data has been synced.

returns: a `Promise` that resolves once the data has been synced.

Example:

```js
store.dispatch(fetchValues([
  `/profiles/${userId}`,
  `profilePics/${userId}/square`
])).then(() => {
  console.log("received profile data", getValueAtPath(store.getState(), `/profiles/${userId}`));
  console.log("profile picture is", getValueAtPath(store.getState(), `profilePics/${userId}/square`));
});
```

### Selectors

The following selector functions can be used to query the mirror.

#### getValueAtPath(state, path)

Returns the value at the given firebase database path, as it was most recently mirrored, as an `Immutable` object.

Param | Type | Description
------|------|------------
`state` | Redux State | The redux store's state, i.e. `store.getState()`
`path` | `string` | The firebase database path to get.

Returns: `undefined | boolean | number | string | Immutable.List | Immutable.Map` - The immutable value at the given path as an Immutable object, or `undefined` if there is nothing there.

Example:
```js
const userProfile = getValueAtPath(store.getState(), '/profiles/${userId}');
console.log("user is", userProfile.get("name"));
```

#### getKeysAtPath(state, path)

Similar to `getValueAtPath`, but only returns an array of keys at the path.

Param | Type | Description
------|------|------------
`state` | Redux State | The redux store's state, i.e. `store.getState()`
`path` | `string` | The firebase database path to get.

Returns: `string[]` - The list of keys at the given database path.

Example:
```js
const userIds = getKeysAtPath(store.getState(), '/profiles');
userIds.forEach(userId => {
  console.log(
    "user", userId,
    "is named", getValueAtPath(store.getState(), `/profiles/${userId}`).get("name"),
  );
});
```

### Subscriptions

To make subscribing to and querying the same set of paths all over the place easier, you can use the `Subscription` class.

#### new Subscription({paths, value})

Creates a new `Subscription` object which describes how to fetch and interpret values in the database.

Param | Type | Description
------|------|------------
`config` | `Object` | A configuration object for the subscription. See options below.
`config.paths` | `Function` | A function that maps state and props to an array of paths.
`config.value` | `Function` | A function that maps state and props to a particular value in the database.

Example:
```js
const profileById = new Subscription({
  paths: (state, props) => [`/profiles/${props.userId}`],
  value: (state, props) => getValueAtPath(state, `/profiles/${props.userId}`),
});
```

Example of a fanout query:
```js
const friendIds = new Subscription({
  paths: profileById.paths,
  value: (state, props) => getKeysAtPath(state, `/profiles/${props.userId}/friends`),
});

const profilePicById = new Subscription({
  paths: (state, props) => [`/profilePics/${props.userId}/${props.size}`],
  value: (state, props) => (
    getValueAtPath(state, `/profilePics/${props.userId}/${props.size}`) ||
    '/static/silhouette.png'
  )
});

const friendProfilePics = new Subscription({
  paths: (state, props) => [
    ...friendIds.paths(state, props)];
    ...friendIds.value(state, props).map(
      friendId => profilePicById.path(state, {userId: friendId, size: props.size})
    )
  ],
  value: (state, props) => {
    return friendIds.value(state, props).map(
      friendId => profilePicById.value(state, {userId: friendId, size: props.size})
    );
  }
});
```

#### Subscription.fetchNow(store, props)

Will fetch all the data needed by the subscription (filling the mirror in the process) and resolve the returned promise with the subscription's resulting value.

Param | Type | Description
------|------|------------
`store` | Redux State | The redux store.
`props` | `Object` | Whatever props are needed by the subscription's `paths` and `value` functions.

Returns: a `Promise` that resolves to whatever the `value` function returns.

Example:
```js
friendProfilePics
  .fetchNow(store, {userId: getLoggedInUser(store.getState()), size: 'small'})
  .then(urls => {
    console.log("profile pictures of your friends can be found at the following urls:", urls.join('\n'));
  });
```

#### Subscription.mapProps(mapper)

Creates a new subscription object that can handle props with different names. Useful in conjunction with the react higher order components.

Param | Type | Description
------|------|------------
`mapper` | `Function` | A function that translates from one prop format to another.

returns: a new `Subscription` instance.

Example:
```js
// let me pass in userId as id instead
friendProfilePics.mapProps(({id}) => ({userId: id}));
```

### React Higher-Order-Components



### Mirroring firebase

To start mirroring a part of your firebase database, just dispatch the
`subscribeToValues()` action creator:

```jsx
store.dispatch(reduxFirebaseMirror.subscribeToValues([
  'first/path/to/mirror',
  'other/path/to/mirror',
]));
```

### Looking up mirrored data

Any firebase paths that are subscribed to will be mirrored directly in your
redux store, so you can look them up with the `valueAtPath()` function:

```jsx
reduxFirebareMirror.valueAtPath(store.getState(), 'first/path/to/mirror');
```

Note that rather than storing the plain json values returned from firebase,
`redux-firebase-mirror` converts them
to [immutable-js](https://facebook.github.io/immutable-js/) objects.

## Usage with react

`redux-firebase-mirror` provides a `subscribePaths` higher order component to
make it simple to declaratively specify what paths a particular react component
needs data from in order to render. Used in conjunction with `react-redux`'s
`connect()` function, it becomes pretty easy to inject firebase data into your
react component:

```jsx
import React, {Component} from 'react';
import {subscribePaths, getFirebaseMirror} from 'redux-firebase-mirror';

@subscribePaths((state, props) => [`users/${props.userId}`])
@connect(
  (state, props) => ({
    user: getFirebaseMirror(state).getIn(['users', props.userId]),
  })
)
class UserProfile extends Component {
  render() {
    if (!this.props.user) {
      return <div>Loading...</div>;
    }
    return <div>This is {this.props.user.get('name')}'s profile</div>;
  }
}
```

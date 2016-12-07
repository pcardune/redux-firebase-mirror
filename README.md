# redux-firebase-mirror
A library to help you easily mirror firebase data inside a redux store, and use
that data inside a react application

## Installation

```
npm install redux-firebase-mirror
```

## Peer Dependencies

`redux-firebase-mirror` has the following peer and optional dependencies:
* `redux` - this should be obvious. This library is designed to work with redux
  so you need to have it installed for this to be of any use.
* `redux-thunk` - You must set up your redux store with
  the [redux-thunk middleware](https://www.npmjs.com/package/redux-thunk) which
  this library uses to execute asynchronous redux actions.

## Basic Usage

Data from firebase will be mirrored in your redux state tree. For this to work,
you must incorporate `redux-firebase-mirror`'s redux reducer into your project's
top-level redux reducer.

### Setting up the reducer

To incorporate `redux-firebase-mirror`'s reducer into your top-level reducer,
it's recommended that you use the `combineReducers()` utility function from
`redux`. To get `redux-firebase-mirror`'s reducer, you must call the
`configureReducer()` function, which takes a config object that describes how
`firebase-redux-mirror` can look up the part of the state tree that it owns.
Here is an example of what this might look like:

```jsx
import * as reduxFirebaseMirror from 'redux-firebase-mirror';
import {combineReducers, createStore} from 'redux';
import thunkMiddleware from 'redux-thunk';

const store = createStore(
  combineReducers({
    firebaseMirror: reduxFirebaseMirror.configureModule({
      getFirebaseState: state => state.firebaseMirror,
    })
  }),
  applyMiddleware(thunkMiddleware)
);
```

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

//@flow
import React, {Component} from 'react';
import firebase from 'firebase';
import * as Immutable from 'immutable';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {compose} from 'redux';
import type {Store} from 'redux';
import type {State, Dispatch, ThunkAction} from './redux/types';
import cachingStorageReducer from './cachingStorageReducer';
import immutableReducer from './immutableReducer';

type JSONType = | string | number | boolean | null | JSONObject | JSONArray;
type JSONObject = { [key: string]: JSONType };
type JSONArray = Array<JSONType>;

const CONFIG: {
  localStoragePrefix: string,
  getFirebaseState: (state: State) => Immutable.Map<string, *>,
} = {
  localStoragePrefix: '',
  getFirebaseState() {
    throw new Error("redux-firebase has not been configured");
  }
};

function receiveSnapshot(snapshot) {
  return {
    type: 'FIREBASE/RECEIVE_SNAPSHOT',
    path: snapshot.ref.toString().split('/').slice(3).join('/'),
    value: snapshot.val(),
  };
}

export type Action =
  | {type: 'FIREBASE/RECEIVE_SNAPSHOT', path: string, value: JSONType}
  | {type: 'FIREBASE/UNSUBSCRIBE_FROM_VALUE', path: string}
  | {type: 'FIREBASE/SUBSCRIBE_TO_VALUES', paths: string[]};

// ----------- actions -------
export function subscribeToValues(paths: string[]) {
  return (dispatch: Dispatch, getState: () => State) => {
    const state = getState();
    paths = paths.filter(path => !isSubscribedToValue(state, path));
    if (paths.length == 0) {
      return;
    }
    dispatch({type: 'FIREBASE/SUBSCRIBE_TO_VALUES', paths});
    const dispatchSnapshot = snapshot => dispatch(receiveSnapshot(snapshot));
    paths.forEach(path => {
      firebase.database().ref(path).on('value', dispatchSnapshot);
    });
  };
}

export function fetchValues(paths: string[], callback: ?() => void): ThunkAction<void> {
  return (dispatch) => {
    let numLeft = paths.length;
    const dispatchSnapshot = snapshot => {
      dispatch(receiveSnapshot(snapshot));
      numLeft--;
      if (numLeft === 0) {
        callback && callback();
      }
    };
    paths.forEach(path => firebase.database().ref(path).once(
      'value',
      dispatchSnapshot,
    ));
  };
}

export function unsubscribeFromValues(paths: string[]) {
  return (dispatch: Dispatch, getState: () => State) => {
    paths = paths.filter(path => isSubscribedToValue(getState(), path));
    if (paths.length === 0) {
      return;
    }
    paths.forEach(path => firebase.database().ref(path).off('value'));
    dispatch({type: 'FIREBASE/UNSUBSCRIBE_FROM_VALUES', paths});
  };
}

// ---------------- selectors --------------
function getFirebaseState(state: State): Immutable.Map<string, Immutable.Map<string, mixed>> {
  const firebaseState = CONFIG.getFirebaseState(state);
  return firebaseState;
}

const getFirebaseSubscriptions = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('subscriptions')
);

export function isSubscribedToValue(state: State, path: string): boolean {
  // TODO: since we are pretending to have subscribed to all subpaths
  // we should make sure to resubscribe them if we unsubscribe from the
  // parent path!
  var lastSlash = path.lastIndexOf('/');
  while (lastSlash >= 0) {
    var isSubscribed = getFirebaseSubscriptions(state).get(path);
    if (isSubscribed) {
      return true;
    }
    path = path.slice(0, lastSlash);
    lastSlash = path.lastIndexOf('/');
  }
  return false;
}

export const getFirebaseMirror = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('mirror')
);

export class Subscription<S, P, R> {

  paths: (state: S, props: P) => string[];
  value: (state: S, props: P) => R;

  constructor(props: {paths: (state: S, props: P) => string[], value: (state: S, props: P) => R}) {
    this.paths = props.paths;
    this.value = props.value;
  }

  fetchNow(store: Store<*, *>, props: P): Promise<R> {
    return new Promise((resolve) => {
      let paths = Immutable.Set(this.paths(store.getState(), props));
      store.dispatch(
        fetchValues(paths.toJS(), () => {
          let newPaths = Immutable.Set(this.paths(store.getState(), props));
          if (newPaths.subtract(paths).size == 0) {
            resolve(this.value(store.getState(), props));
          } else {
            this.fetchNow(store, props).then(resolve);
          }
        })
      );
    });
  }
}

// ----------- subscription utilities ---------

export function subscribePaths<RS, NP:Object, D, P:Object, S, C: React$Component<D, P, S>>(
  mapPropsToPaths: (state: RS, props: NP) => string[]
): (c: Class<C>) => Class<React$Component<void, P & NP, void>> {
  return (ComponentToWrap: Class<C>) => {
    return connect(
      (state: RS)=>({state}),
      (dispatch: Dispatch) => ({dispatch})
    )(class WrapperComponent extends Component {

      props: NP & P & {
        dispatch: Dispatch,
        state: RS,
      };

      componentDidMount() {
        this.props.dispatch(subscribeToValues(mapPropsToPaths(this.props.state, this.props)));
      }

      componentDidUpdate() {
        const paths = mapPropsToPaths(this.props.state, this.props);
        // TODO: make this work.
        // in theory we should have already subscribed to the values in the prev paths
        // but that doesn't seem to be happening for some reason I do not yet understand.
        // so to play it safe, ditch this micro-opitmization for now.
        // const prevPaths = new Set(mapPropsToPaths(this.props.state, prevProps));
        // const newPaths = paths.filter(path => !prevPaths.has(path));
        this.props.dispatch(subscribeToValues(paths));
      }

      render() {
        let {
          dispatch: ignoreDispatch, //eslint-disable-line
          state: ignoreState, //eslint-disable-line
          ...rest
        } = this.props;
        return <ComponentToWrap {...rest} />;
      }
    });
  };
}

export function keysAtPath(state: any, props: any, path: string | string[]) {
  if (typeof path !== "string") {
    throw new Error("You can only use keysAtPath for a single path");
  }
  const map = getFirebaseMirror(state).getIn(path.split('/'), Immutable.Map());
  if (!map) {
    return [];
  }
  return map.keySeq().toArray();
}

export function valueAtPath(state: State, path: string) {
  return getFirebaseMirror(state).getIn(path.split('/'));
}

export function valuesAtPaths(state: State, paths: string[]) {
  const values:Immutable.Map<string, mixed> = Immutable.Map();
  return values.withMutations(values => {
    paths.forEach(path => {
      const parts = path.split('/');
      values.set(parts[parts.length - 1], valueAtPath(state, path));
    });
  });
}

export function configureModule(config: {
  getFirebaseState(state: any): Immutable.Map<string, *>,
  persistToLocalStorage?: ?boolean,
  storagePrefix?: ?string,
}): typeof immutableReducer {
  CONFIG.getFirebaseState = config.getFirebaseState;
  if (config.persistToLocalStorage) {
    return compose(cachingStorageReducer({storagePrefix: config.storagePrefix}), immutableReducer());
  }
  return immutableReducer();
}

export function getConfig(): typeof CONFIG {
  return CONFIG;
}

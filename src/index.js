//@flow
import * as Immutable from 'immutable';
import {createSelector} from 'reselect';
import {compose} from 'redux';
import cachingStorageReducer from './cachingStorageReducer';
import getReducer from './reducer';
export * from './actions';
import immutableStorage from './immutableStorage';
import type {StorageAPI} from './types';

const CONFIG: {
  localStoragePrefix: string,
  getFirebaseState: <S>(state: S) => Immutable.Map<string, *>,
} = {
  localStoragePrefix: '',
  getFirebaseState() {
    throw new Error("redux-firebase has not been configured");
  }
};

// ---------------- selectors --------------
function getFirebaseState(state: *): Immutable.Map<string, Immutable.Map<string, mixed>> {
  const firebaseState = CONFIG.getFirebaseState(state);
  return firebaseState;
}

const getFirebaseSubscriptions = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('subscriptions')
);

export function isSubscribedToValue(state: any, path: string): boolean {
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

/**
 * Configure the redux-firebase-mirror module.
 * @param config configuration required to use `redux-firebase-mirror`
 * @param config.getFirebaseState a function that returns the subtree of the
 *        redux state where the reducer was applied.
 * @param config.persistToLocalStorage whether or not to persist firebase
 *        data to local storage
 * @param config.storagePrefix an optional prefix for the keys used in local
 *        storage
 */
export default function configureReducer(config: {
  getFirebaseState: (state: any) => Immutable.Map<string, *>,
  persistToLocalStorage?: ?boolean,
  storagePrefix?: ?string,
  storageAPI?: ?StorageAPI<*, *>
}) {
  CONFIG.getFirebaseState = config.getFirebaseState;
  let storageAPI: StorageAPI<*, *> = config.storageAPI || immutableStorage;

  const selectors = {
    getKeysAtPath(state: any, path: string) {
      return storageAPI.getKeysAtPath(getFirebaseMirror(state), path);
    },

    getValueAtPath(state: any, path: string) {
      return storageAPI.getValueAtPath(getFirebaseMirror(state), path);
    },
  };


  let reducer = getReducer(storageAPI);
  if (config.persistToLocalStorage) {
    reducer = compose(
      cachingStorageReducer({storagePrefix: config.storagePrefix, storageAPI}),
      reducer,
    );
  }
  return {reducer, selectors};
}

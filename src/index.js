/**
 * The main module that you will need to import
 * @module
 * @name redux-firebase-mirror
 */
//@flow
import * as Immutable from 'immutable';
import {createSelector} from 'reselect';
import cachingStorageReducer from './cachingStorageReducer';
import getReducer from './reducer';
import * as actions from './actions';
import type {StorageAPI} from './types';
import Subscription from './Subscription';
import {subscribePaths, subscribeProps} from './hoc';
import {DEFAULT_CONFIG, CONFIG} from './config';

// ---------------- selectors --------------
function getFirebaseState(
  state: *
): Immutable.Map<string, Immutable.Map<string, mixed>> {
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
 * @typedef {Object} ConfiguredModule
 * @property {Selectors} selectors - selectors for querying the firebase mirror's state
 * @property {Function} reducer - The reducer function to use with your own redux store
 */

/**
 * Configures the redux-firebase-mirror module.
 * @name reduxFirebaseMirror
 *
 * @example
 * const {reducer, selectors} = reduxFirebaseMirror({
 *   getFirebaseState: (state) => state.mirror,
 *   persistToLocalStorage: {
 *     storagePrefix: 'firebase-cache',
 *     storage: window.sessionStorage,
 *   }
 * });
 *
 * @param {Object} [config] - optional configuration with which to initialize `redux-firebase-mirror`
 * @param {Function} [config.getFirebaseState] - a function that returns the subtree of the
 *        redux state where the reducer was applied.
 * @param {PersistanceConfig} [config.persistToLocalStorage] - whether or not to persist firebase
 *        data to local storage
 * @returns {ConfiguredModule} an object containing both the reducer and a set of selectors.
 */
export default function configureReducer(
  config: ?{
    getFirebaseState: (state: any) => Immutable.Map<string, *>,
    persistToLocalStorage?: ?{
      storagePrefix?: ?string,
      storage?: ?{
        setItem(key: string, value: string): any,
        getItem(key: string): ?string,
      },
    },
    storageAPI?: ?StorageAPI<*, *>,
  }
) {
  config = {...DEFAULT_CONFIG, ...config};
  CONFIG.getFirebaseState = config.getFirebaseState;
  CONFIG.storageAPI = config.storageAPI;
  CONFIG.persistToLocalStorage = config.persistToLocalStorage;

  let reducer;
  const stateReducer = getReducer(CONFIG.storageAPI);
  if (config.persistToLocalStorage) {
    const cachingReducer = cachingStorageReducer(config.persistToLocalStorage);
    reducer = (state, action) =>
      cachingReducer(stateReducer(state, action), action);
  } else {
    reducer = stateReducer;
  }
  return reducer;
}

export function getKeysAtPath(state: any, path: string) {
  if (!path) {
    throw new Error('You must specify a path from which to get keys');
  }
  return CONFIG.storageAPI.getKeysAtPath(getFirebaseMirror(state), path);
}

export function getValueAtPath(state: any, path: string) {
  if (!path) {
    throw new Error('You must specify a path from which to get a value');
  }
  return CONFIG.storageAPI.getValueAtPath(getFirebaseMirror(state), path);
}

export const RECEIVE_SNAPSHOT = actions.RECEIVE_SNAPSHOT;
export const UNSUBSCRIBE_FROM_VALUES = actions.UNSUBSCRIBE_FROM_VALUES;
export const SUBSCRIBE_TO_VALUES = actions.SUBSCRIBE_TO_VALUES;

export const subscribeToValues = actions.subscribeToValues;
export const fetchValues = actions.fetchValues;
export const unsubscribeFromValues = actions.unsubscribeFromValues;

export {
  // subscriptions
  Subscription,
  subscribeProps,
  subscribePaths,
};

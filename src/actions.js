/**
 * @module redux action creators
 * @name actions
 */
/* eslint-env browser */

//@flow
import firebase from 'firebase';

import type {JSONType} from './types';
import {isSubscribedToValue} from './selectors';
import {CONFIG} from './config';
import {normalizePath} from './util';
import {
  RECEIVE_SNAPSHOT,
  UNSUBSCRIBE_FROM_VALUES,
  SUBSCRIBE_TO_VALUES,
  DEFAULT_CACHE_PREFIX,
} from './constants';

export type FSA =
  | {type: 'FIREBASE/RECEIVE_SNAPSHOT', path: string, value: JSONType}
  | {type: 'FIREBASE/UNSUBSCRIBE_FROM_VALUES', paths: string[]}
  | {type: 'FIREBASE/SUBSCRIBE_TO_VALUES', paths: string[]};
export type Action = FSA | (<R>(d: Dispatch, getState: <S>() => S) => ?R);
export type PathConfig = {
  path: string,
  filter?: {
    limitToLast?: number,
    limitToFirst?: number,
    endAt?: number,
    startAt?: number,
    equalTo?: any, // TODO: specify this more carefully?
  },
  orderByChild?: string,
  orderByKey?: boolean,
  orderByValue?: boolean,
};
export type PathSpec = string | PathConfig;

function receiveSnapshot(snapshot) {
  return {
    type: RECEIVE_SNAPSHOT,
    path: decodeURIComponent(
      snapshot.ref.toString().split('/').slice(3).join('/')
    ),
    value: snapshot.val(),
  };
}

/**
 * Subscribe to `'value'` changes for the specified list of paths in firebase.
 * @param {string[]} paths - the list of paths to subscribe to.
 */
export function subscribeToValues<S>(paths: PathSpec[]) {
  return (dispatch: Dispatch, getState: () => S) => {
    paths = paths.filter(
      path =>
        !isSubscribedToValue(
          getState(),
          // TODO: isSubscribedToValue should probably handle PathSpec objects
          typeof path === 'string' ? path : path.path
        )
    );
    if (paths.length == 0) {
      return;
    }
    const stringPaths = paths.map(
      path => (typeof path === 'string' ? path : path.path)
    );
    if (CONFIG.persistToLocalStorage) {
      // TODO: we probably need to keep track of full path specs?
      dispatch(loadValuesFromCache(stringPaths, CONFIG.persistToLocalStorage));
    }
    dispatch({
      type: SUBSCRIBE_TO_VALUES,
      // TODO: we probably need to keep track of full path specs
      paths: stringPaths,
    });
    const dispatchSnapshot = snapshot => dispatch(receiveSnapshot(snapshot));
    paths.forEach(path => {
      let ref;
      if (typeof path === 'string') {
        ref = firebase.database().ref(path);
      } else {
        ref = firebase.database().ref(path.path);
        if (path.orderByKey) {
          ref = ref.orderByKey();
        } else if (path.orderByValue) {
          ref = ref.orderByValue();
        } else if (path.orderByChild) {
          ref = ref.orderByChild(path.orderByChild);
        }
        if (path.filter) {
          Object.keys(path.filter).forEach(key => {
            ref = ref[key](path.filter[key]);
          });
        }
      }
      ref.on('value', dispatchSnapshot);
    });
  };
}

/**
 * Load values from cache, possibly asynchronously.
 * @param {string[]} paths - the list of paths to load from cache
 * @param {PersistanceConfig} [config] - configuration for the cache
 */
export function loadValuesFromCache(paths: string[], config) {
  return dispatch => {
    if (config) {
      const storagePrefix = config.storagePrefix || DEFAULT_CACHE_PREFIX;
      const storage = config.storage || localStorage;
      return paths.map(path => {
        let valueOrPromise = storage.getItem(
          storagePrefix + normalizePath(path)
        );
        const receiveFromCache = cached => {
          if (!cached) {
            return;
          }
          try {
            cached = JSON.parse(cached);
          } catch (e) {
            // failed to parse json, just skip this.
            return;
          }
          dispatch({
            type: RECEIVE_SNAPSHOT,
            path: path,
            value: cached,
            fromCache: true,
          });
          return cached;
        };
        if (valueOrPromise instanceof Promise) {
          return valueOrPromise.then(receiveFromCache);
        } else {
          return receiveFromCache(valueOrPromise);
        }
      });
    }
  };
}

/**
 * Perform a one-time fetch from firebase of all the given paths.
 * @param {string[]} paths -  the list of paths to subscribe to.
 * @param {callback} [callback] - function to call when all the data has been fetched.
 * @callback callback
 * @returns {Promise} - a Promise which resolves when the fetch is completed
 */
export function fetchValues(paths: string[], callback: ?() => void) {
  return (dispatch: Dispatch) => {
    let numLeft = paths.length;
    return new Promise(resolve => {
      const dispatchSnapshot = snapshot => {
        dispatch(receiveSnapshot(snapshot));
        numLeft--;
        if (numLeft === 0) {
          callback && callback();
          resolve();
        }
      };
      paths.forEach(path =>
        firebase.database().ref(path).once('value', dispatchSnapshot)
      );
    });
  };
}

/**
 * Unsubscribe from `'value'` changes for the specified list of paths in firebase.
 *
 * @param {string[]} paths -  the list of paths to unsubscribe from.
 * @returns {void}
 */
export function unsubscribeFromValues(paths: string[]) {
  return (dispatch: Dispatch, getState: () => *) => {
    paths = paths.filter(path => isSubscribedToValue(getState(), path));
    if (paths.length === 0) {
      return;
    }
    paths.forEach(path => firebase.database().ref(path).off('value'));
    dispatch({type: UNSUBSCRIBE_FROM_VALUES, paths});
  };
}

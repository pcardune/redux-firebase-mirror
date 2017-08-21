/**
 * @module redux action creators
 * @name actions
 */
/* eslint-env browser */

//@flow

import type {JSONType} from './types';
import {isSubscribedToValue} from './selectors';
import {CONFIG} from './config';
import {normalizePath} from './util';
import {
  RECEIVE_SNAPSHOTS,
  UNSUBSCRIBE_FROM_VALUES,
  SUBSCRIBE_TO_VALUES,
  DEFAULT_CACHE_PREFIX,
  REHYDRATE,
} from './constants';

export type FSA =
  | {type: 'FIREBASE/RECEIVE_SNAPSHOTS', path: string, value: JSONType}
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

function receiveSnapshots(snapshots) {
  const values = {};
  snapshots.forEach(snapshot => {
    values[
      normalizePath(
        decodeURIComponent(
          snapshot.ref.toString().split('/').slice(3).join('/')
        )
      )
    ] = snapshot.val();
  });
  return {
    type: RECEIVE_SNAPSHOTS,
    values,
  };
}

export const _moduleState = {
  dispatchTimeout: null,
  receiveQueue: [],
};

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
    const stringPaths = paths.map(path =>
      normalizePath(typeof path === 'string' ? path : path.path)
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
    const dispatchSnapshot = snapshot => {
      if (_moduleState.dispatchTimeout) {
        _moduleState.receiveQueue.push(snapshot);
      } else {
        dispatch(receiveSnapshots([snapshot]));
        _moduleState.dispatchTimeout = setTimeout(() => {
          _moduleState.dispatchTimeout = null;
          const snapshots = _moduleState.receiveQueue;
          _moduleState.receiveQueue = [];
          if (snapshots.length > 0) {
            dispatch(receiveSnapshots(snapshots));
          }
        }, CONFIG.syncInterval);
      }
    };
    paths.forEach(path => {
      let ref;
      if (typeof path === 'string') {
        ref = CONFIG.getFirebase().database().ref(path);
      } else {
        ref = CONFIG.getFirebase().database().ref(path.path);
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
  paths = paths.map(normalizePath);
  return dispatch => {
    if (config) {
      const storagePrefix = config.storagePrefix || DEFAULT_CACHE_PREFIX;
      const storage = config.storage || localStorage;
      let valuesToDispatch = {};
      let numReceived = 0;
      let timeout = null;
      const dispatchValues = () => {
        const values = valuesToDispatch;
        valuesToDispatch = {};
        clearTimeout(timeout);
        dispatch({
          type: RECEIVE_SNAPSHOTS,
          values,
          fromCache: true,
        });
      };

      return paths.map(path => {
        let valueOrPromise = storage.getItem(
          storagePrefix + normalizePath(path)
        );
        const receiveFromCache = cached => {
          numReceived++;
          if (!cached) {
            return;
          }
          try {
            cached = JSON.parse(cached);
          } catch (e) {
            // failed to parse json, just skip this.
            return;
          }
          valuesToDispatch[path] = cached;
          if (numReceived === paths.length) {
            // once we have received everything from cache, dispatch the results
            clearTimeout(timeout);
            dispatch({
              type: RECEIVE_SNAPSHOTS,
              values: valuesToDispatch,
              fromCache: true,
            });
          } else {
            // wait sync interval before dispatching results
            // so we don't dispatch too often and block the browser.
            if (!timeout) {
              timeout = setTimeout(dispatchValues, CONFIG.syncInterval);
            }
          }
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
        dispatch(receiveSnapshots([snapshot]));
        numLeft--;
        if (numLeft === 0) {
          callback && callback();
          resolve();
        }
      };
      paths.forEach(path =>
        CONFIG.getFirebase()
          .database()
          .ref(path)
          .once('value', dispatchSnapshot)
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
    paths.forEach(path =>
      CONFIG.getFirebase().database().ref(path).off('value')
    );
    dispatch({type: UNSUBSCRIBE_FROM_VALUES, paths});
  };
}

/**
 * Rehydrate the state of the firebase mirror with the given data.
 * Note that this will not cause new subscritions to be created.
 */
export function rehydrate(data) {
  return {type: REHYDRATE, data};
}

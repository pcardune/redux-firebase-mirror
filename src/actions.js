/**
 * @module redux action creators
 * @name actions
 */
/* eslint-env browser */

//@flow

import type {JSONType} from './types';
import {isSubscribedToValue} from './selectors';
import {CONFIG} from './config';
import {normalizePath, getPathSpecKey} from './util';
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

export function receiveSnapshots(snapshots) {
  const values = {};
  snapshots.forEach(({pathSpec, snapshot}) => {
    values[getPathSpecKey(pathSpec)] = {
      pathSpec,
      value: snapshot.val(),
    };
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
    paths = paths.filter(path => !isSubscribedToValue(getState(), path));
    if (paths.length == 0) {
      return;
    }
    if (CONFIG.persistToLocalStorage) {
      dispatch(loadValuesFromCache(paths, CONFIG.persistToLocalStorage));
    }
    dispatch({
      type: SUBSCRIBE_TO_VALUES,
      paths,
    });
    const dispatchSnapshot = pathSpec => snapshot => {
      if (_moduleState.dispatchTimeout) {
        _moduleState.receiveQueue.push({pathSpec, snapshot});
      } else {
        dispatch(receiveSnapshots([{pathSpec, snapshot}]));
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
    paths.forEach(pathSpec => {
      let ref;
      if (typeof pathSpec === 'string') {
        ref = CONFIG.getFirebase().database().ref(pathSpec);
      } else {
        ref = CONFIG.getFirebase().database().ref(pathSpec.path);
        if (pathSpec.orderByKey) {
          ref = ref.orderByKey();
        } else if (pathSpec.orderByValue) {
          ref = ref.orderByValue();
        } else if (pathSpec.orderByChild) {
          ref = ref.orderByChild(pathSpec.orderByChild);
        }
        if (pathSpec.filter) {
          Object.keys(pathSpec.filter).forEach(key => {
            ref = ref[key](pathSpec.filter[key]);
          });
        }
      }
      ref.on('value', dispatchSnapshot(pathSpec));
    });
  };
}

/**
 * Load values from cache, possibly asynchronously.
 * @param {PathSpec[]} pathSpecs - the list of pathSpecs to load from cache
 * @param {PersistanceConfig} [config] - configuration for the cache
 */
export function loadValuesFromCache(pathSpecs: PathSpec[], config) {
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

      return pathSpecs.map(pathSpec => {
        const pathSpecKey = getPathSpecKey(pathSpec);
        let valueOrPromise = storage.getItem(storagePrefix + pathSpecKey);
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
          valuesToDispatch[pathSpecKey] = {
            pathSpec: pathSpec,
            value: cached,
          };
          if (numReceived === pathSpecs.length) {
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
      const dispatchSnapshot = pathSpec => snapshot => {
        dispatch(receiveSnapshots([{pathSpec, snapshot}]));
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
          .once('value', dispatchSnapshot(path))
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

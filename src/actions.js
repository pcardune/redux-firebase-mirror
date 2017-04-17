/**
 * @module redux action creators
 * @name actions
 */
/* eslint-env browser */

//@flow
import firebase from 'firebase';

import type {JSONType} from './types';
import {isSubscribedToValue} from './index';
import {CONFIG} from './config';
import {normalizePath} from './util';
export type FSA =
  | {type: 'FIREBASE/RECEIVE_SNAPSHOT', path: string, value: JSONType}
  | {type: 'FIREBASE/UNSUBSCRIBE_FROM_VALUES', paths: string[]}
  | {type: 'FIREBASE/SUBSCRIBE_TO_VALUES', paths: string[]};
export type Action = FSA | (<R>(d: Dispatch, getState: <S>() => S) => ?R);

export const RECEIVE_SNAPSHOT = 'FIREBASE/RECEIVE_SNAPSHOT';
export const UNSUBSCRIBE_FROM_VALUES = 'FIREBASE/UNSUBSCRIBE_FROM_VALUES';
export const SUBSCRIBE_TO_VALUES = 'FIREBASE/SUBSCRIBE_TO_VALUES';

function receiveSnapshot(snapshot) {
  return {
    type: RECEIVE_SNAPSHOT,
    path: snapshot.ref.toString().split('/').slice(3).join('/'),
    value: snapshot.val(),
  };
}

/**
 * Subscribe to `'value'` changes for the specified list of paths in firebase.
 * @param {string[]} paths - the list of paths to subscribe to.
 */
export function subscribeToValues<S>(paths: string[]) {
  return (dispatch: Dispatch, getState: () => S) => {
    paths = paths.filter(path => !isSubscribedToValue(getState(), path));
    if (paths.length == 0) {
      return;
    }
    if (CONFIG.persistToLocalStorage) {
      dispatch(loadValuesFromCache(paths, CONFIG.persistToLocalStorage));
    }
    dispatch({type: SUBSCRIBE_TO_VALUES, paths});
    const dispatchSnapshot = snapshot => dispatch(receiveSnapshot(snapshot));
    paths.forEach(path => {
      firebase.database().ref(path).on('value', dispatchSnapshot);
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
      const storagePrefix = config.storagePrefix || '';
      const storage = config.storage || localStorage;
      return paths.map(path => {
        let valueOrPromise = storage.getItem(
          storagePrefix + normalizePath(path),
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
        firebase.database().ref(path).once('value', dispatchSnapshot));
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

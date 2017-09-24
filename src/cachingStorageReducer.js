/* eslint-env browser */
//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';
import {RECEIVE_SNAPSHOTS, DEFAULT_CACHE_PREFIX} from './constants';
import {normalizePath, getPathSpecKey} from './util';

interface Storage {
  setItem(key: string, value: string): any,
  getItem(key: string): ?string,
}

/**
 * @typedef {Object} PersistanceConfig
 * @type {object}
 * @property {string} [storagePrefix] - prefix to use for keys when setting values in local
 *           or session storage
 * @property {(LocalStorage|SessionStorage)} [storage] - An object providing the same api as
 *           localStorage or sessionStorage
 */

export default (config: ?{storagePrefix?: ?string, storage?: ?Storage}) =>
  combineReducers({
    subscriptions(state = Immutable.Map()) {
      return state;
    },
    mirror(state = Immutable.Map(), action) {
      config = config || {};
      const storagePrefix = config.storagePrefix || DEFAULT_CACHE_PREFIX;
      const storage = config.storage || localStorage;
      if (action.type === RECEIVE_SNAPSHOTS && !action.fromCache) {
        Object.keys(action.values).forEach(path => {
          storage.setItem(
            storagePrefix + getPathSpecKey(path),
            JSON.stringify(action.values[getPathSpecKey(path)].value)
          );
        });
      }
      return state;
    },
  });

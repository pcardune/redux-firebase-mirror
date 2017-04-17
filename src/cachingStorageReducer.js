/* eslint-env browser */
//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';
import {RECEIVE_SNAPSHOT} from './actions';
import {normalizePath} from './util';

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
      const storagePrefix = config.storagePrefix || '';
      const storage = config.storage || localStorage;
      switch (action.type) {
        case RECEIVE_SNAPSHOT:
          if (!action.fromCache) {
            storage.setItem(
              storagePrefix + normalizePath(action.path),
              JSON.stringify(action.value),
            );
          }
          return state;
        default:
          return state;
      }
    },
  });

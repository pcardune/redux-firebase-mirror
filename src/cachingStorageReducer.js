/* eslint-env browser */
//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';
import {RECEIVE_SNAPSHOT, SUBSCRIBE_TO_VALUES} from './actions';
import {splitPath} from './util';

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
          storage.setItem(
            storagePrefix + action.path,
            JSON.stringify(action.value),
          );
          return state;
        case SUBSCRIBE_TO_VALUES:
          return state.withMutations(state => {
            action.paths.forEach(path => {
              let cached = storage.getItem(storagePrefix + path);
              if (cached) {
                try {
                  cached = JSON.parse(cached);
                } catch (e) {
                  // failed to parse json, just skip this.
                  return;
                }
                state.setIn(splitPath(path), Immutable.fromJS(cached));
              }
            });
          });
        default:
          return state;
      }
    },
  });

/* eslint-env browser */
//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';
import {RECEIVE_SNAPSHOT, SUBSCRIBE_TO_VALUES} from './actions';
import {splitPath} from './util';

interface Storage {
  setItem(key: string, value: string): any;
  getItem(key: string): ?string;
}

export default (config: ?{storagePrefix?: ?string, cacheStorage?: ?Storage}) => combineReducers({
  mirror(state=Immutable.Map(), action) {
    config = config || {};
    const storagePrefix = config.storagePrefix || '';
    const storage = config.cacheStorage || localStorage;
    switch (action.type) {
      case RECEIVE_SNAPSHOT:
        storage.setItem(
          storagePrefix + action.path,
          JSON.stringify(action.value)
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
  }
});

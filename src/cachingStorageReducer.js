/* eslint-env browser */
//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';

interface Storage {
  setItem(key: string, value: string): any;
  getItem(key: string): ?string;
}

export default (config: {storagePrefix?: ?string, cacheStorage?: ?Storage}) => combineReducers({
  mirror(state=Immutable.Map(), action) {
    const storagePrefix = config.storagePrefix || '';
    const storage = config.cacheStorage || localStorage;
    switch (action.type) {
      case 'FIREBASE/RECEIVE_SNAPSHOT':
        storage.setItem(
          storagePrefix + action.path,
          JSON.stringify(action.value)
        );
        return state;
      case 'FIREBASE/SUBSCRIBE_TO_VALUES':
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
              state.setIn(path.split('/'), Immutable.fromJS(cached));
            }
          });
        });
      default:
        return state;
    }
  }
});

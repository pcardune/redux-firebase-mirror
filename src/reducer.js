//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';

import type {StorageAPI} from './types';
import {
  RECEIVE_SNAPSHOT,
  SUBSCRIBE_TO_VALUES,
  UNSUBSCRIBE_FROM_VALUES,
} from './actions';

export default <M, V>(storageAPI: StorageAPI<M, V>) =>
  combineReducers({
    subscriptions(state = Immutable.Map(), action) {
      switch (action.type) {
        case SUBSCRIBE_TO_VALUES:
          return state.withMutations(state => {
            action.paths.forEach(path => state.set(path, true));
          });
        case UNSUBSCRIBE_FROM_VALUES:
          return state.withMutations(state => {
            action.paths.forEach(path => state.deleteIn(path));
          });
        default:
          return state;
      }
    },

    mirror(state, action) {
      if (state === undefined) {
        state = storageAPI.getInitialMirror();
      }
      switch (action.type) {
        case RECEIVE_SNAPSHOT:
          return storageAPI.setValues(state, {[action.path]: action.value});
        default:
          return state;
      }
    },
  });
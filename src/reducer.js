//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';

import type {StorageAPI} from './types';
import {
  RECEIVE_SNAPSHOTS,
  UNSUBSCRIBE_FROM_VALUES,
  SUBSCRIBE_TO_VALUES,
} from './constants';

export default <M, V>(storageAPI: StorageAPI<M, V>) =>
  combineReducers({
    subscriptions(state = Immutable.Map(), action) {
      switch (action.type) {
        case RECEIVE_SNAPSHOTS:
          return state.withMutations(state => {
            Object.keys(action.values).forEach(path => {
              state.setIn([path, 'lastUpdateTime'], new Date().getTime());
            });
          });
        case SUBSCRIBE_TO_VALUES:
          return state.withMutations(state => {
            action.paths.forEach(path =>
              state.setIn([path, 'time'], new Date().getTime())
            );
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
        case RECEIVE_SNAPSHOTS:
          return storageAPI.setValues(state, action.values);
        default:
          return state;
      }
    },
  });

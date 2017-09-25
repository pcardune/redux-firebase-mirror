//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';

import type {StorageAPI} from './types';
import {normalizePath, getPathSpecKey} from './util';
import {
  RECEIVE_SNAPSHOTS,
  UNSUBSCRIBE_FROM_VALUES,
  SUBSCRIBE_TO_VALUES,
  REHYDRATE,
} from './constants';

export default <M, V>(storageAPI: StorageAPI<M, V>) =>
  combineReducers({
    subscriptions(state = Immutable.Map(), action) {
      switch (action.type) {
        case RECEIVE_SNAPSHOTS:
          return state.withMutations(state => {
            Object.values(action.values).forEach(({pathSpec}) => {
              state.setIn(
                [getPathSpecKey(pathSpec), 'lastUpdateTime'],
                new Date().getTime()
              );
            });
          });
        case SUBSCRIBE_TO_VALUES:
          return state.withMutations(state => {
            action.paths.forEach(path =>
              state.setIn([getPathSpecKey(path), 'time'], new Date().getTime())
            );
          });
        case UNSUBSCRIBE_FROM_VALUES:
          return state.withMutations(state => {
            action.paths.forEach(path => state.deleteIn(getPathSpecKey(path)));
          });
        case REHYDRATE:
          return Immutable.fromJS(action.data.subscriptions);
        default:
          return state;
      }
    },

    mirror(state, action) {
      if (state === undefined) {
        state = storageAPI.getInitialMirror();
      }
      switch (action.type) {
        case RECEIVE_SNAPSHOTS: {
          const values = {};
          Object.values(action.values).forEach(({pathSpec, value}) => {
            if (typeof pathSpec === 'string') {
              values[pathSpec] = value;
            } else {
              let existing = values[pathSpec.path] || {};
              existing = {...existing, ...value};
              Object.keys(value).forEach(childKey => {
                values[pathSpec.path + '/' + childKey] = value[childKey];
              });
            }
          });
          return storageAPI.setValues(state, values);
        }
        case REHYDRATE:
          return Immutable.fromJS(action.data.mirror);
        default:
          return state;
      }
    },
  });

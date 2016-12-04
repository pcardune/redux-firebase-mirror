//@flow
import {combineReducers} from 'redux-immutable';
import * as Immutable from 'immutable';

export default () => combineReducers({
  subscriptions(state=Immutable.Map(), action) {
    switch (action.type) {
      case 'FIREBASE/SUBSCRIBE_TO_VALUES':
        return state.withMutations(state => {
          action.paths.forEach(path => state.set(path, true));
        });
      case 'FIREBASE/UNSUBSCRIBE_FROM_VALUES':
        return state.withMutations(state => {
          action.paths.forEach(path => state.deleteIn(path));
        });
      default:
        return state;
    }
  },

  mirror(state=Immutable.Map(), action) {
    switch (action.type) {
      case 'FIREBASE/RECEIVE_SNAPSHOT':
        return state.setIn(
          action.path.split('/'),
          Immutable.fromJS(action.value)
        );
      default:
        return state;
    }
  }
});

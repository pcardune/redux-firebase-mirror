//@flow
import type {State, Dispatch, ThunkAction} from './redux/types';
import firebase from 'firebase';

import type {JSONType} from './index';
import {isSubscribedToValue} from './index';

function receiveSnapshot(snapshot) {
  return {
    type: 'FIREBASE/RECEIVE_SNAPSHOT',
    path: snapshot.ref.toString().split('/').slice(3).join('/'),
    value: snapshot.val(),
  };
}

export type Action =
  | {type: 'FIREBASE/RECEIVE_SNAPSHOT', path: string, value: JSONType}
  | {type: 'FIREBASE/UNSUBSCRIBE_FROM_VALUE', path: string}
  | {type: 'FIREBASE/SUBSCRIBE_TO_VALUES', paths: string[]};

/**
 * Subscribe to `'value'` changes for the specified list of paths in firebase.
 * @param paths the list of paths to subscribe to.
 */
export function subscribeToValues(paths: string[]) {
  return (dispatch: Dispatch, getState: () => State) => {
    const state = getState();
    paths = paths.filter(path => !isSubscribedToValue(state, path));
    if (paths.length == 0) {
      return;
    }
    dispatch({type: 'FIREBASE/SUBSCRIBE_TO_VALUES', paths});
    const dispatchSnapshot = snapshot => dispatch(receiveSnapshot(snapshot));
    paths.forEach(path => {
      firebase.database().ref(path).on('value', dispatchSnapshot);
    });
  };
}

/**
 * Perform a one-time fetch from firebase of all the given paths.
 * @param paths the list of paths to subscribe to.
 * @param callback function to call when all the data has been fetched.
 */
export function fetchValues(paths: string[], callback: ?() => void): ThunkAction<void> {
  return (dispatch) => {
    let numLeft = paths.length;
    const dispatchSnapshot = snapshot => {
      dispatch(receiveSnapshot(snapshot));
      numLeft--;
      if (numLeft === 0) {
        callback && callback();
      }
    };
    paths.forEach(path => firebase.database().ref(path).once(
      'value',
      dispatchSnapshot,
    ));
  };
}

/**
 * Unsubscribe from `'value'` changes for the specified list of paths in firebase.
 * @param paths the list of paths to unsubscribe from.
 */
export function unsubscribeFromValues(paths: string[]) {
  return (dispatch: Dispatch, getState: () => State) => {
    paths = paths.filter(path => isSubscribedToValue(getState(), path));
    if (paths.length === 0) {
      return;
    }
    paths.forEach(path => firebase.database().ref(path).off('value'));
    dispatch({type: 'FIREBASE/UNSUBSCRIBE_FROM_VALUES', paths});
  };
}

import {createSelector} from 'reselect';
import {CONFIG} from './config';

function getFirebaseState(
  state: *
): Immutable.Map<string, Immutable.Map<string, mixed>> {
  const firebaseState = CONFIG.getFirebaseState(state);
  return firebaseState;
}

const getFirebaseSubscriptions = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('subscriptions')
);

export function isSubscribedToValue(state: any, path: string): boolean {
  // TODO: since we are pretending to have subscribed to all subpaths
  // we should make sure to resubscribe them if we unsubscribe from the
  // parent path!
  var lastSlash = path.lastIndexOf('/');
  while (lastSlash >= 0) {
    var isSubscribed = getFirebaseSubscriptions(state).get(path);
    if (isSubscribed) {
      return true;
    }
    path = path.slice(0, lastSlash);
    lastSlash = path.lastIndexOf('/');
  }
  return false;
}

export const getFirebaseMirror = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('mirror')
);

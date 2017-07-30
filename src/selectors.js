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

function getSubscriptionInformation(state: any, path: string) {
  var lastSlash = path.lastIndexOf('/');
  while (lastSlash >= 0) {
    var subscriptionInfo = getFirebaseSubscriptions(state).get(path);
    if (subscriptionInfo) {
      return subscriptionInfo;
    }
    path = path.slice(0, lastSlash);
    lastSlash = path.lastIndexOf('/');
  }
  return null;
}

export function isSubscribedToValue(state: any, path: string): boolean {
  // TODO: since we are pretending to have subscribed to all subpaths
  // we should make sure to resubscribe them if we unsubscribe from the
  // parent path!
  const subscriptionInfo = getSubscriptionInformation(state, path);
  return !!(subscriptionInfo && subscriptionInfo.get('time'));
}

export function hasReceivedValue(state: any, path: string): boolean {
  const subscriptionInfo = getSubscriptionInformation(state, path);
  return !!(subscriptionInfo && subscriptionInfo.get('lastUpdateTime'));
}

export const getFirebaseMirror = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('mirror')
);

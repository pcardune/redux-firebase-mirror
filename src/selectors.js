import {createSelector} from 'reselect';
import memoize from 'lodash.memoize';
import {CONFIG} from './config';
import {normalizePath} from './util';

function getFirebaseState(
  state: *
): Immutable.Map<string, Immutable.Map<string, mixed>> {
  const firebaseState = CONFIG.getFirebaseState(state);
  return firebaseState;
}

const firebaseSubscriptionsSelector = createSelector(
  [getFirebaseState],
  firebaseState => firebaseState.get('subscriptions')
);

const subscriptionInformationSelector = createSelector(
  [firebaseSubscriptionsSelector],
  subscriptions =>
    memoize(path => {
      path = normalizePath(path);
      var lastSlash = path.lastIndexOf('/');
      while (lastSlash >= 0) {
        var subscriptionInfo = subscriptions.get(path);
        if (subscriptionInfo) {
          return subscriptionInfo;
        }
        path = normalizePath(path.slice(0, lastSlash));
        lastSlash = path.lastIndexOf('/');
      }
      return subscriptions.get(path, null);
    }, normalizePath)
);

export const hasReceivedValueSelector = createSelector(
  [subscriptionInformationSelector],
  getSubscriptionInformation =>
    memoize(path => {
      const subscriptionInfo = getSubscriptionInformation(path);
      return !!(subscriptionInfo && subscriptionInfo.get('lastUpdateTime'));
    }, normalizePath)
);

export const isSubscribedToValueSelector = createSelector(
  [subscriptionInformationSelector],
  getSubscriptionInformation =>
    memoize(path => {
      // TODO: since we are pretending to have subscribed to all subpaths
      // we should make sure to resubscribe them if we unsubscribe from the
      // parent path!
      const subscriptionInfo = getSubscriptionInformation(path);
      return !!(subscriptionInfo && subscriptionInfo.get('time'));
    }, normalizePath)
);

export function isSubscribedToValue(state: any, path: string): boolean {
  return isSubscribedToValueSelector(state)(path);
}

export function hasReceivedValue(state: any, path: string): boolean {
  return hasReceivedValueSelector(state)(path);
}

export const getFirebaseMirror = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('mirror')
);

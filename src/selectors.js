import {createSelector} from 'reselect';
import memoize from 'lodash.memoize';
import {CONFIG} from './config';
import {normalizePath, getPathSpecKey} from './util';

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
    memoize(pathSpec => {
      if (typeof pathSpec === 'string') {
        // minor optimization.
        let path = pathSpec;
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
      }
      const key = getPathSpecKey(pathSpec);
      return subscriptions.get(key, null);
    }, normalizePath)
);

export const getDehydratedState = createSelector(
  [getFirebaseState],
  firebaseState => ({
    mirror: firebaseState.get('mirror').toJS(),
    subscriptions: firebaseState
      .get('subscriptions')
      .map(subscription => subscription.delete('time'))
      .toJS(),
  })
);

export const hasReceivedValueSelector = createSelector(
  [subscriptionInformationSelector],
  getSubscriptionInformation =>
    memoize(pathSpec => {
      const subscriptionInfo = getSubscriptionInformation(pathSpec);
      return !!(subscriptionInfo && subscriptionInfo.get('lastUpdateTime'));
    }, normalizePath)
);

export const isSubscribedToValueSelector = createSelector(
  [subscriptionInformationSelector],
  getSubscriptionInformation =>
    memoize(pathSpec => {
      // TODO: since we are pretending to have subscribed to all subpaths
      // we should make sure to resubscribe them if we unsubscribe from the
      // parent path!
      const subscriptionInfo = getSubscriptionInformation(pathSpec);
      return !!(subscriptionInfo && subscriptionInfo.get('time'));
    }, normalizePath)
);

export function isSubscribedToValue(state: any, pathSpec: PathSpec): boolean {
  return isSubscribedToValueSelector(state)(pathSpec);
}

export function hasReceivedValue(state: any, pathSpec: PathSpec): boolean {
  return hasReceivedValueSelector(state)(pathSpec);
}

export const getFirebaseMirror = createSelector(
  getFirebaseState,
  firebaseState => firebaseState.get('mirror')
);

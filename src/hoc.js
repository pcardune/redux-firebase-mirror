//@flow
import React, {Component} from 'react';
import {connect} from 'react-redux';
import type {Dispatch} from 'redux';
import {compose} from 'redux';

import {subscribeToValues} from './actions';
import {getPathSpecKey} from './util';

function ownProps(props) {
  let {
    __dispatch: ignoreDispatch, //eslint-disable-line
    __state: ignoreState, //eslint-disable-line
    ...rest
  } = props;
  return rest;
}

export function subscribePaths<
  RS,
  NP: Object,
  D,
  P: Object,
  S,
  C: React.Component<D, P, S>
>(mapPropsToPaths: (state: RS, props: NP) => string[]) {
  function getPaths(props) {
    const paths = mapPropsToPaths(props.__state, ownProps(props));
    if (!Array.isArray(paths)) {
      throw new Error(
        'The function given to subscribePaths() must return an array of strings'
      );
    }
    return paths;
  }

  return (ComponentToWrap: Class<C>) => {
    return connect(
      (__state: RS) => ({__state}),
      (__dispatch: Dispatch<*, *>) => ({__dispatch})
    )(
      class WrapperComponent extends Component {
        props: NP &
          P & {
            __dispatch: Dispatch<*, *>,
            __state: RS,
          };

        componentWillMount() {
          const paths = getPaths(this.props);
          this.props.__dispatch(subscribeToValues(paths));
        }

        componentDidUpdate(prevProps) {
          const paths = getPaths(this.props);
          const prevPaths = new Set(
            mapPropsToPaths(prevProps.__state, ownProps(prevProps)).map(
              getPathSpecKey
            )
          );
          const newPaths = paths.filter(
            path => !prevPaths.has(getPathSpecKey(path))
          );
          this.props.__dispatch(subscribeToValues(newPaths));
        }

        render() {
          return <ComponentToWrap {...ownProps(this.props)} />;
        }
      }
    );
  };
}

export function subscribeProps(mapPropsToSubscriptionsMaybeFunc) {
  let mapPropsToSubscriptions;
  if (typeof mapPropsToSubscriptionsMaybeFunc == 'function') {
    mapPropsToSubscriptions = mapPropsToSubscriptionsMaybeFunc;
  } else {
    mapPropsToSubscriptions = () => mapPropsToSubscriptionsMaybeFunc;
  }
  return ComponentToWrap => {
    return compose(
      subscribePaths((state, ownProps) => {
        const subscriptionsMap = mapPropsToSubscriptions(state, ownProps);
        return Object.values(subscriptionsMap).reduce(
          (paths, subscription) =>
            paths.concat(subscription.paths(state, ownProps)),
          []
        );
      }),
      connect(
        (state, ownProps) => {
          const subscriptionsMap = mapPropsToSubscriptions(state, ownProps);
          const props = {};
          for (const key in subscriptionsMap) {
            props[key] = subscriptionsMap[key].value(state, ownProps);
          }
          return props;
        },
        () => ({})
      )
    )(ComponentToWrap);
  };
}

//@flow
import React, {Component} from 'react';
import {connect} from 'react-redux';
import type {Dispatch} from 'redux';

export function subscribePaths<RS, NP:Object, D, P:Object, S, C: React$Component<D, P, S>>(
  mapPropsToPaths: (state: RS, props: NP) => string[]
): (c: Class<C>) => Class<React$Component<void, P & NP, void>> {
  return (ComponentToWrap: Class<C>) => {
    return connect(
      (state: RS)=>({state}),
      (dispatch: Dispatch<*, *>) => ({dispatch})
    )(class WrapperComponent extends Component {

      props: NP & P & {
        dispatch: Dispatch<*, *>,
        state: RS,
      };

      componentDidMount() {
        this.props.dispatch(actions.subscribeToValues(mapPropsToPaths(this.props.state, this.props)));
      }

      componentDidUpdate() {
        const paths = mapPropsToPaths(this.props.state, this.props);
        // TODO: make this work.
        // in theory we should have already subscribed to the values in the prev paths
        // but that doesn't seem to be happening for some reason I do not yet understand.
        // so to play it safe, ditch this micro-opitmization for now.
        // const prevPaths = new Set(mapPropsToPaths(this.props.state, prevProps));
        // const newPaths = paths.filter(path => !prevPaths.has(path));
        this.props.dispatch(actions.subscribeToValues(paths));
      }

      render() {
        let {
          dispatch: ignoreDispatch, //eslint-disable-line
          state: ignoreState, //eslint-disable-line
          ...rest
        } = this.props;
        return <ComponentToWrap {...rest} />;
      }
    });
  };
}

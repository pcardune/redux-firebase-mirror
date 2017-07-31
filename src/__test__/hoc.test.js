//@flow
import React, {Component} from 'react';
import {mount} from 'enzyme';
import firebase from 'firebase';
import thunkMiddleware from 'redux-thunk';
import {createStore, applyMiddleware} from 'redux';
import {Provider} from 'react-redux';
import * as Immutable from 'immutable';
import reduxFirebaseMirror from '../index';
import {subscribePaths, subscribeProps} from '../hoc';
import {SUBSCRIBE_TO_VALUES} from '../constants';
import Subscription from '../Subscription';

jest.mock('firebase');

describe('the hoc.js module', () => {
  let store, dispatchedActions;
  beforeEach(() => {
    firebase.database.mockReturnValue({
      ref: jest.fn(path => {
        return {
          on: jest.fn(),
          off: jest.fn(),
          once: jest.fn(),
          path,
        };
      }),
    });
    dispatchedActions = [];
    const middlewares = [
      thunkMiddleware,
      () => next => (action: any) => {
        dispatchedActions.push(action);
        return next(action);
      },
    ];

    store = createStore(
      reduxFirebaseMirror({
        getFirebaseState: state => state,
      }),
      Immutable.Map(),
      applyMiddleware(...middlewares)
    );
  });

  class Something extends Component {
    render() {
      return null;
    }
  }

  function render(component) {
    return mount(
      <Provider store={store}>
        {component}
      </Provider>
    ).find(Something);
  }

  describe('The subscribePaths higher-order-component', () => {
    let mapStateToPaths, SmartComponent;
    beforeEach(() => {
      mapStateToPaths = jest.fn().mockReturnValue([]);
      SmartComponent = subscribePaths(mapStateToPaths)(Something);
    });

    it('dispatches a SUBSCRIBE_TO_VALUES action when the component mounts', () => {
      mapStateToPaths.mockReturnValue(['foo', 'bar']);
      expect(dispatchedActions).toEqual([]);
      render(<SmartComponent />);
      expect(dispatchedActions).toEqual([
        {
          type: SUBSCRIBE_TO_VALUES,
          paths: ['foo', 'bar'],
        },
      ]);
    });

    it('takes a function that is given state and props to generate paths', () => {
      const state = store.getState();
      render(<SmartComponent foo="1" bar="2" />);
      expect(mapStateToPaths).toHaveBeenCalledWith(state, {foo: '1', bar: '2'});
    });

    it('throws a helpful error message if the function does not return an array of paths', () => {
      mapStateToPaths.mockReturnValue('foo');
      expect(() => render(<SmartComponent foo="1" bar="2" />)).toThrowError(
        'The function given to subscribePaths() must return an array of strings'
      );
    });
  });

  describe('The subscribeProps higher-order-component', () => {
    let mapPropsToSubscriptions, SmartComponent, fooById;
    beforeEach(() => {
      fooById = new Subscription({
        paths: jest.fn().mockReturnValue([]),
        value: jest.fn().mockReturnValue(null),
      });
      mapPropsToSubscriptions = jest.fn().mockReturnValue({});
      SmartComponent = subscribeProps(mapPropsToSubscriptions)(Something);
    });

    it('takes a function that is given state and props to generate a props subscription object', () => {
      const state = store.getState();
      render(<SmartComponent foo="1" bar="2" />);
      expect(mapPropsToSubscriptions).toHaveBeenCalledWith(state, {
        foo: '1',
        bar: '2',
      });
    });

    it('takes an object mapping props to subscriptions', () => {
      SmartComponent = subscribeProps({foo: fooById})(Something);
      render(<SmartComponent id="1" />);
    });

    it('will pass the state and props to each of the props subscriptions', () => {
      mapPropsToSubscriptions.mockReturnValue({foo: fooById});
      const state = store.getState();
      render(<SmartComponent id="1" bar="2" />);
      expect(fooById.paths).toHaveBeenCalledWith(state, {id: '1', bar: '2'});
      expect(fooById.value).toHaveBeenCalledWith(state, {id: '1', bar: '2'});
    });

    it('will subscribe to all the paths of the various subscriptions', () => {
      mapPropsToSubscriptions.mockReturnValue({foo: fooById});
      fooById.paths.mockReturnValue(['foo', 'bar']);
      expect(dispatchedActions).toEqual([]);
      render(<SmartComponent />);
      expect(dispatchedActions).toEqual([
        {
          type: SUBSCRIBE_TO_VALUES,
          paths: ['foo', 'bar'],
        },
      ]);
    });

    it('will populate the prop with whatever the subscription returns', () => {
      const value = {};
      mapPropsToSubscriptions.mockReturnValue({foo: fooById});
      fooById.value.mockReturnValue(value);
      expect(render(<SmartComponent />).props().foo).toBe(value);
    });
  });
});

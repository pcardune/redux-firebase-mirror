//@flow
import thunkMiddleware from 'redux-thunk';
import {createStore, applyMiddleware} from 'redux';
import * as Immutable from 'immutable';
import reduxFirebaseMirror, {subscribeToValues, unsubscribeFromValues, fetchValues} from '../index';
import * as actions from '../actions';

describe("The redux-firebase-mirror module", () => {
  it("should export all the functions from the actions module", () => {
    expect(subscribeToValues).toBe(actions.subscribeToValues);
    expect(unsubscribeFromValues).toBe(actions.unsubscribeFromValues);
    expect(fetchValues).toBe(actions.fetchValues);
  });

  describe("the default exported function", () => {
    let api, store;
    beforeEach(() => {
      api = reduxFirebaseMirror({
        getFirebaseState: state => state,
      });
      store = createStore(
        api.reducer,
        Immutable.Map(),
        applyMiddleware(thunkMiddleware)
      );
    });

    it("should return some selectors", () => {
      expect(api.selectors.getKeysAtPath).toEqual(jasmine.any(Function));
      expect(api.selectors.getValueAtPath).toEqual(jasmine.any(Function));
    });

    describe("the getKeysAtPath selector", () => {
      it("should return an empty list for paths that have not been fetched yet", () => {
        expect(api.selectors.getKeysAtPath(store.getState(), 'foo')).toEqual([]);
        expect(api.selectors.getKeysAtPath(store.getState(), 'foo/bar/baz')).toEqual([]);
      });

      it("should return a list of keys for a path that has been fetched", () => {
        store.dispatch({
          type: 'FIREBASE/RECEIVE_SNAPSHOT',
          path: 'foo/bar/baz',
          value: 1,
        });
        expect(api.selectors.getKeysAtPath(store.getState(), 'foo')).toEqual(['bar']);
        expect(api.selectors.getKeysAtPath(store.getState(), 'foo/bar')).toEqual(['baz']);
        expect(api.selectors.getKeysAtPath(store.getState(), 'foo/bar/baz')).toEqual([]);
      });
    });

    describe("the getValueAtPath selector", () => {
      it("should return undefined for paths that have not been fetched yet", () => {
        expect(api.selectors.getValueAtPath(store.getState(), 'foo')).toBeUndefined();
        expect(api.selectors.getValueAtPath(store.getState(), 'foo/bar/baz')).toBeUndefined();
      });
      it("should return the value when it has been fetched", () => {
        store.dispatch({
          type: 'FIREBASE/RECEIVE_SNAPSHOT',
          path: 'foo/bar/baz',
          value: 1,
        });
        const foo = api.selectors.getValueAtPath(store.getState(), 'foo');
        if (foo instanceof Immutable.Map) {
          expect(foo.toJS()).toEqual({bar:{baz:1}});
        } else {
          throw new Error("expected to get a map");
        }
        expect(api.selectors.getValueAtPath(store.getState(), 'foo/bar/baz')).toEqual(1);
      });
    });
  });
});

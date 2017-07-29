//@flow
import thunkMiddleware from 'redux-thunk';
import {createStore, applyMiddleware, combineReducers} from 'redux';
import * as Immutable from 'immutable';
import firebase from 'firebase';
import reduxFirebaseMirror, {
  getKeysAtPath,
  getValueAtPath,
  subscribeToValues,
  unsubscribeFromValues,
  fetchValues,
  getFirebaseMirror,
} from '../index';
import * as actions from '../actions';

jest.mock('firebase');

describe('The redux-firebase-mirror module', () => {
  it('should export all the functions from the actions module', () => {
    expect(subscribeToValues).toEqual(jasmine.any(Function));
    expect(unsubscribeFromValues).toBe(actions.unsubscribeFromValues);
    expect(fetchValues).toBe(actions.fetchValues);
  });

  describe('The selector functions', () => {
    let store;
    beforeEach(() => {
      store = createStore(
        reduxFirebaseMirror({
          getFirebaseState: state => state,
        }),
        Immutable.Map(),
        applyMiddleware(thunkMiddleware)
      );
    });

    describe('the getKeysAtPath selector', () => {
      it('should return an empty list for paths that have not been fetched yet', () => {
        expect(getKeysAtPath(store.getState(), 'foo')).toEqual([]);
        expect(getKeysAtPath(store.getState(), 'foo/bar/baz')).toEqual([]);
      });

      it('should return a list of keys for a path that has been fetched', () => {
        store.dispatch({
          type: 'FIREBASE/RECEIVE_SNAPSHOTS',
          values: {'foo/bar/baz': 1},
        });
        expect(getKeysAtPath(store.getState(), 'foo')).toEqual(['bar']);
        expect(getKeysAtPath(store.getState(), 'foo/bar')).toEqual(['baz']);
        expect(getKeysAtPath(store.getState(), 'foo/bar/baz')).toEqual([]);
      });
    });

    describe('the getValueAtPath selector', () => {
      it('should return undefined for paths that have not been fetched yet', () => {
        expect(getValueAtPath(store.getState(), 'foo')).toBeUndefined();
        expect(getValueAtPath(store.getState(), 'foo/bar/baz')).toBeUndefined();
      });
      it('should return the value when it has been fetched', () => {
        store.dispatch({
          type: 'FIREBASE/RECEIVE_SNAPSHOTS',
          values: {'foo/bar/baz': 1},
        });
        const foo = getValueAtPath(store.getState(), 'foo');
        if (foo instanceof Immutable.Map) {
          expect(foo.toJS()).toEqual({bar: {baz: 1}});
        } else {
          throw new Error('expected to get a map');
        }
        expect(getValueAtPath(store.getState(), 'foo/bar/baz')).toEqual(1);
      });
    });
  });

  describe('the getFirebaseMirror function', () => {
    describe('when no configuration is passed to the module', () => {
      beforeEach(() => reduxFirebaseMirror());
      it('will throw an error if no state is available at the firebaseMirror key', () => {
        expect(() => getFirebaseMirror({})).toThrowError(
          "redux-firebase-mirror's reducer must be mounted with combineReducers() under the 'firebaseMirror' key"
        );
      });
      it('will not throw an error if the state is available at said key', () => {
        expect(() =>
          getFirebaseMirror({firebaseMirror: Immutable.Map()})
        ).not.toThrow();
      });
    });
  });

  describe('the configureReducer function', () => {
    describe('The persistToLocalStorage config key', () => {
      let store, storage;
      beforeEach(() => {
        storage = {
          getItem: jest.fn(),
          setItem: jest.fn(),
        };
        store = createStore(
          reduxFirebaseMirror({
            persistToLocalStorage: {
              storage,
            },
          }),
          Immutable.Map(),
          applyMiddleware(thunkMiddleware)
        );
      });

      it('will cause the caching storage reducer to be called', () => {
        store.dispatch({
          type: 'FIREBASE/RECEIVE_SNAPSHOTS',
          values: {'foo/bar/baz': 1},
        });
        expect(storage.setItem).toHaveBeenCalledWith(
          'firebase-mirror:foo/bar/baz',
          '1'
        );
        expect(store.getState().toJS()).toEqual({
          mirror: {foo: {bar: {baz: 1}}},
          subscriptions: {},
        });
      });
    });
  });

  describe('the subscribeToValues function', () => {
    let store, dispatchedActions, refs;
    beforeEach(() => {
      refs = {};
      firebase.database.mockReturnValue({
        ref: jest.fn(path => {
          refs[path] = {
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn(),
            path,
          };
          return refs[path];
        }),
      });
    });
    describe('when persistToLocalStorage is off (by default)', () => {
      beforeEach(() => {
        dispatchedActions = [];
        store = createStore(
          combineReducers({firebaseMirror: reduxFirebaseMirror()}),
          applyMiddleware(thunkMiddleware, () => next => (action: any) => {
            dispatchedActions.push(action);
            return next(action);
          })
        );
      });
      it('will just call actions.subscribeToValues', () => {
        store.dispatch(subscribeToValues(['/foo']));
        expect(dispatchedActions).toEqual([
          {paths: ['/foo'], type: 'FIREBASE/SUBSCRIBE_TO_VALUES'},
        ]);
      });
    });
    describe('when persistToLocalStorage is enabled', () => {
      beforeEach(() => {
        dispatchedActions = [];
        store = createStore(
          combineReducers({
            firebaseMirror: reduxFirebaseMirror({
              persistToLocalStorage: {
                storage: {
                  getItem: path => JSON.stringify('value of ' + path),
                },
              },
            }),
          }),
          applyMiddleware(thunkMiddleware, () => next => (action: any) => {
            dispatchedActions.push(action);
            return next(action);
          })
        );
      });
      it('will also call actions.loadValuesFromCache', () => {
        store.dispatch(subscribeToValues(['/foo']));
        expect(dispatchedActions).toEqual([
          {
            fromCache: true,
            type: 'FIREBASE/RECEIVE_SNAPSHOTS',
            values: {
              '/foo': 'value of firebase-mirror:foo',
            },
          },
          {paths: ['/foo'], type: 'FIREBASE/SUBSCRIBE_TO_VALUES'},
        ]);
      });
    });
  });
});

//@flow
import {createStore, applyMiddleware} from 'redux';
import thunkMiddleware from 'redux-thunk';
import firebase from 'firebase';
import type {Store} from 'redux';
import * as Immutable from 'immutable';

import reduxFirebaseMirror from '../index';

import type {Action} from '../actions';
import {
  subscribeToValues,
  unsubscribeFromValues,
  fetchValues,
  loadValuesFromCache,
} from '../actions';

jest.mock('firebase');

function mockSnapshot(path, value) {
  return {
    ref:
      'ws://firebase-database/' +
      encodeURIComponent(path.split('/').filter(s => s).join('/')),
    val: () => value,
  };
}

describe('The actions module', () => {
  let store: Store<*, Action>, dispatchedActions;
  beforeEach(() => {
    dispatchedActions = [];
    const middlewares = [
      thunkMiddleware,
      () => next => (action: any) => {
        dispatchedActions.push(action);
        return next(action);
      },
    ];

    const reducer = reduxFirebaseMirror({
      getFirebaseState: state => state,
    });

    store = createStore(
      reducer,
      Immutable.Map(),
      applyMiddleware(...middlewares)
    );
  });

  describe('After the module has been configured', () => {
    let refs;
    beforeEach(() => {
      refs = {};
      firebase.database.mockReturnValue({
        ref: jest.fn(path => {
          refs[path] = {
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn(),
            orderByChild: jest.fn().mockReturnThis(),
            orderByKey: jest.fn().mockReturnThis(),
            orderByValue: jest.fn().mockReturnThis(),
            endAt: jest.fn().mockReturnThis(),
            startAt: jest.fn().mockReturnThis(),
            limitToFirst: jest.fn().mockReturnThis(),
            limitToLast: jest.fn().mockReturnThis(),
            equalTo: jest.fn().mockReturnThis(),
            path,
          };
          return refs[path];
        }),
      });
    });

    describe('The loadValuesFromCache() action creator', () => {
      describe('when given a falsy config', () => {
        it('is a no-op', () => {
          store.dispatch(loadValuesFromCache(['/foo']));
          expect(dispatchedActions).toEqual([]);
        });
      });

      describe('when using a synchronous storage backend', () => {
        let storage;

        beforeEach(() => {
          storage = {
            getItem: jest
              .fn()
              .mockImplementation(
                path =>
                  path === 'firebase-mirror:null'
                    ? null
                    : path === 'firebase-mirror:bad-json'
                      ? 'fkjdalfhjd'
                      : JSON.stringify('value for ' + path)
              ),
          };
        });

        it('will ignore null cache values', () => {
          store.dispatch(
            loadValuesFromCache(['/null'], {
              storage,
            })
          );
          expect(storage.getItem).toHaveBeenCalledWith('firebase-mirror:null');
          expect(dispatchedActions).toEqual([]);
        });

        it('will ignore bad json cache values', () => {
          store.dispatch(
            loadValuesFromCache(['/bad-json'], {
              storage,
            })
          );
          expect(storage.getItem).toHaveBeenCalledWith(
            'firebase-mirror:bad-json'
          );
          expect(dispatchedActions).toEqual([]);
        });

        it('will load values from a cache', () => {
          store.dispatch(
            loadValuesFromCache(['/foo', '/bar'], {
              storage,
            })
          );
          expect(storage.getItem).toHaveBeenCalledWith('firebase-mirror:foo');
          expect(storage.getItem).toHaveBeenCalledWith('firebase-mirror:bar');
          expect(dispatchedActions).toEqual([
            {
              type: 'FIREBASE/RECEIVE_SNAPSHOTS',
              values: {
                '/foo': 'value for firebase-mirror:foo',
                '/bar': 'value for firebase-mirror:bar',
              },
              fromCache: true,
            },
          ]);
        });
      });

      describe('when using an asynchronous storage backend', () => {
        let storage;
        beforeEach(() => {
          storage = {
            getItem: jest
              .fn()
              .mockImplementation(async path =>
                JSON.stringify('value for ' + path)
              ),
          };
        });
        it('will load values from a cache asynchronously', async () => {
          await Promise.all(
            store.dispatch(loadValuesFromCache(['/foo', '/bar'], {storage}))
          );
          expect(storage.getItem).toHaveBeenCalledWith('firebase-mirror:foo');
          expect(storage.getItem).toHaveBeenCalledWith('firebase-mirror:bar');
          expect(dispatchedActions).toEqual([
            {
              type: 'FIREBASE/RECEIVE_SNAPSHOTS',
              values: {
                '/foo': 'value for firebase-mirror:foo',
                '/bar': 'value for firebase-mirror:bar',
              },
              fromCache: true,
            },
          ]);
        });
      });
    });

    describe('The subscribeToValues() action creator', () => {
      describe('when handling path spec objects', () => {
        it('will handle the orderByKey config', () => {
          store.dispatch(
            subscribeToValues([
              {
                path: '/baz',
                orderByKey: true,
              },
            ])
          );
          expect(refs['/baz'].orderByKey).toHaveBeenCalled();
        });

        it('will handle the orderByValue config', () => {
          store.dispatch(
            subscribeToValues([
              {
                path: '/baz',
                orderByValue: true,
              },
            ])
          );
          expect(refs['/baz'].orderByValue).toHaveBeenCalled();
        });

        it('will handle the orderByChild config', () => {
          store.dispatch(
            subscribeToValues([
              {
                path: '/baz',
                orderByChild: 'someChildKey',
              },
            ])
          );
          expect(refs['/baz'].orderByChild).toHaveBeenCalledWith(
            'someChildKey'
          );
        });

        it('will call all the appropriate filter functions', () => {
          store.dispatch(
            subscribeToValues([
              {
                path: '/baz',
                filter: {
                  limitToLast: 10,
                  limitToFirst: 15,
                  startAt: 50,
                  endAt: 100,
                  equalTo: 'foo',
                },
              },
            ])
          );
          expect(refs['/baz'].limitToLast).toHaveBeenCalledWith(10);
          expect(refs['/baz'].limitToFirst).toHaveBeenCalledWith(15);
          expect(refs['/baz'].startAt).toHaveBeenCalledWith(50);
          expect(refs['/baz'].endAt).toHaveBeenCalledWith(100);
          expect(refs['/baz'].equalTo).toHaveBeenCalledWith('foo');
        });
      });

      describe('when dispatched with a list of paths', () => {
        beforeEach(() => {
          store.dispatch(
            subscribeToValues([
              '/foo',
              '/bar',
              {
                path: '/baz',
                filter: {limitToLast: 1, startAt: 10},
                orderByKey: true,
              },
            ])
          );
        });

        it('will subscribe to the firebase ref at the given paths', () => {
          expect(Object.keys(refs).length).toBe(3);
          expect(firebase.database().ref).toHaveBeenCalledWith('/foo');
          expect(firebase.database().ref).toHaveBeenCalledWith('/bar');
          expect(firebase.database().ref).toHaveBeenCalledWith('/baz');
          expect(refs['/foo'].on).toHaveBeenCalledWith(
            'value',
            jasmine.any(Function)
          );
          expect(refs['/bar'].on).toHaveBeenCalledWith(
            'value',
            jasmine.any(Function)
          );
        });

        it('will apply the appropriate filters specified in a path config object', () => {
          expect(refs['/baz'].limitToLast).toHaveBeenCalledWith(1);
          expect(refs['/baz'].startAt).toHaveBeenCalledWith(10);
          expect(refs['/baz'].orderByKey).toHaveBeenCalled();
        });

        it('will dispatch some redux actions', () => {
          expect(dispatchedActions).toEqual([
            {
              type: 'FIREBASE/SUBSCRIBE_TO_VALUES',
              paths: ['/foo', '/bar', '/baz'],
            },
          ]);
        });

        describe('when a subsequent subscribeToValues action creator is dispatched', () => {
          beforeEach(() => {
            store.dispatch(subscribeToValues(['/bar', '/zap']));
          });

          it('will only subscribe to firebase refs that have not already been subscribed to', () => {
            expect(Object.keys(refs).length).toBe(4);
            expect(firebase.database().ref).toHaveBeenCalledWith('/zap');
            expect(refs['/foo'].on).toHaveBeenCalledTimes(1);
            expect(refs['/bar'].on).toHaveBeenCalledTimes(1);
            expect(refs['/zap'].on).toHaveBeenCalledWith(
              'value',
              jasmine.any(Function)
            );
          });

          it('will only dispatch FIREBASE/SUBSCRIBE_TO_VALUES with paths that are newly subscribed to', () => {
            expect(dispatchedActions.length).toBe(2);
            expect(dispatchedActions[1]).toEqual({
              type: 'FIREBASE/SUBSCRIBE_TO_VALUES',
              paths: ['/zap'],
            });
          });
        });

        describe('when a subsequent subscribeToValues action creator is dispatched where all paths were already subscribed to', () => {
          beforeEach(() => {
            store.dispatch(subscribeToValues(['/bar', '/foo']));
          });

          it('will not dispatch any actions', () => {
            expect(dispatchedActions.length).toBe(1);
          });
        });

        describe('when the firebase value event is triggered', () => {
          beforeEach(() => {
            refs['/foo'].on.mock.calls[0][1](
              mockSnapshot('/foo&bar', 'foo-value')
            );
          });

          it('will dispatch a FIREBASE/RECEIVE_SNAPSHOTS event', () => {
            expect(dispatchedActions.length).toBe(2);
            expect(dispatchedActions[1]).toEqual({
              type: 'FIREBASE/RECEIVE_SNAPSHOTS',
              values: {'foo&bar': 'foo-value'},
            });
          });
        });
      });

      describe('when dispatched with an empty list of paths', () => {
        beforeEach(() => {
          store.dispatch(subscribeToValues([]));
        });

        it('will not subscribe to any firebase refs', () => {
          expect(Object.keys(refs).length).toBe(0);
          expect(firebase.database().ref).not.toHaveBeenCalled();
        });

        it('will not dispatch any redux actions', () => {
          expect(dispatchedActions).toEqual([]);
        });
      });
    });

    describe('The unsubscribeFromValues() action creator', () => {
      describe('when unsubscribing from paths that are not currently subscribed to', () => {
        beforeEach(() => {
          store.dispatch(unsubscribeFromValues(['/not-current-subscribed']));
        });

        it('will not dispatch any actions', () => {
          expect(dispatchedActions).toEqual([]);
        });
      });

      describe('when unsubscribing from paths that are currently subscribed to', () => {
        beforeEach(() => {
          store.dispatch(subscribeToValues(['/foo']));
          dispatchedActions = [];
          store.dispatch(unsubscribeFromValues(['/foo', '/bar']));
        });

        it('will dispatch a FIREBASE/UNSUBSCRIBE_FROM_VALUES action', () => {
          expect(dispatchedActions).toEqual([
            {
              type: 'FIREBASE/UNSUBSCRIBE_FROM_VALUES',
              paths: ['/foo'],
            },
          ]);
        });

        it('will call the off() method on the firebase ref', () => {
          expect(refs['/foo'].off).toHaveBeenCalledWith('value');
        });
      });
    });

    describe('The fetchValues() action creator', () => {
      let callback;
      beforeEach(() => {
        callback = jest.fn();
        store.dispatch(fetchValues(['/foo', '/bar'], callback));
      });

      it("will call the firebase ref's once('value') method for each path", () => {
        expect(refs['/foo'].once).toHaveBeenCalledWith(
          'value',
          jasmine.any(Function)
        );
        expect(refs['/bar'].once).toHaveBeenCalledWith(
          'value',
          jasmine.any(Function)
        );
      });

      describe('when some of the data has been received', () => {
        beforeEach(() => {
          refs['/foo'].once.mock.calls[0][1](mockSnapshot('/foo', 'foo-value'));
        });

        it('will dispatch a receiveSnapshots action for each firebase value it receives', () => {
          expect(dispatchedActions).toEqual([
            {
              type: 'FIREBASE/RECEIVE_SNAPSHOTS',
              values: {foo: 'foo-value'},
            },
          ]);
        });

        it('will not call the callback function that was initially given to fetchValues', () => {
          expect(callback).not.toHaveBeenCalled();
        });
      });

      describe('when all of the data has been received', () => {
        beforeEach(() => {
          refs['/foo'].once.mock.calls[0][1](mockSnapshot('/foo', 'foo-value'));
          refs['/bar'].once.mock.calls[0][1](mockSnapshot('/bar', 'bar-value'));
        });

        it('will call the callback function that was initially given', () => {
          expect(callback).toHaveBeenCalledWith();
        });
      });
    });
  });
});

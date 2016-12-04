//@flow
import {createStore, applyMiddleware} from 'redux';
import thunkMiddleware from 'redux-thunk';
import firebase from 'firebase';

import {
  configureModule,
  subscribeToValues,
  unsubscribeFromValues,
} from '../index';

jest.mock('firebase');

describe("The redux-firebase-mirror module", () => {
  let store, dispatchedActions;
  beforeEach(() => {
    dispatchedActions = [];
    const middlewares = [
      thunkMiddleware,
      () => next => (action: any) => {
        dispatchedActions.push(action);
        return next(action);
      },
    ];
    store = createStore(
      configureModule({
        getFirebaseState(state) {
          return state;
        },
      }),
      applyMiddleware(...middlewares)
    );
  });

  describe("After the module has been configured", () => {
    let refs;
    beforeEach(() => {
      refs = {};
      firebase.database.mockReturnValue({
        ref: jest.fn((path) => {
          refs[path] = {
            on: jest.fn(),
            off: jest.fn(),
            path,
          };
          return refs[path];
        }),
      });
    });

    describe("The subscribeToValues() action creator", () => {
      describe("when dispatched with a list of paths", () => {
        beforeEach(() => {
          store.dispatch(subscribeToValues(['/foo', '/bar']));
        });

        it("will subscribe to the firebase ref at the given paths", () => {
          expect(Object.keys(refs).length).toBe(2);
          expect(firebase.database().ref).toHaveBeenCalledWith('/foo');
          expect(firebase.database().ref).toHaveBeenCalledWith('/bar');
          expect(refs['/foo'].on).toHaveBeenCalledWith('value', jasmine.any(Function));
          expect(refs['/bar'].on).toHaveBeenCalledWith('value', jasmine.any(Function));
        });

        it("will dispatch some redux actions", () => {
          expect(dispatchedActions).toEqual([
            {
              "type": "FIREBASE/SUBSCRIBE_TO_VALUES",
              "paths": ["/foo", "/bar"],
            }
          ]);
        });

        describe("when a subsequent subscribeToValues action creator is dispatched", () => {
          beforeEach(() => {
            store.dispatch(subscribeToValues(['/bar', '/zap']));
          });

          it("will only subscribe to firebase refs that have not already been subscribed to", () => {
            expect(Object.keys(refs).length).toBe(3);
            expect(firebase.database().ref).toHaveBeenCalledWith('/zap');
            expect(refs['/foo'].on).toHaveBeenCalledTimes(1);
            expect(refs['/bar'].on).toHaveBeenCalledTimes(1);
            expect(refs['/zap'].on).toHaveBeenCalledWith('value', jasmine.any(Function));
          });

          it("will only dispatch FIREBASE/SUBSCRIBE_TO_VALUES with paths that are newly subscribed to", () => {
            expect(dispatchedActions.length).toBe(2);
            expect(dispatchedActions[1]).toEqual(
              {
                "type": "FIREBASE/SUBSCRIBE_TO_VALUES",
                "paths": ["/zap"],
              }
            );
          });

        });

        describe("when a subsequent subscribeToValues action creator is dispatched where all paths were already subscribed to", () => {
          beforeEach(() => {
            store.dispatch(subscribeToValues(['/bar', '/foo']));
          });

          it("will not dispatch any actions", () => {
            expect(dispatchedActions.length).toBe(1);
          });
        });

        describe("when the firebase value event is triggered", () => {
          beforeEach(() => {
            refs['/foo'].on.mock.calls[0][1]({
              ref: 'ws://firebase-database/foo',
              val: () => 'foo-value',
            });
          });

          it("will dispatch a FIREBASE/RECEIVE_SNAPSHOT event", () => {
            expect(dispatchedActions.length).toBe(2);
            expect(dispatchedActions[1]).toEqual({
              type: 'FIREBASE/RECEIVE_SNAPSHOT',
              path: 'foo',
              value: 'foo-value',
            });
          });
        });

      });

      describe("when dispatched with an empty list of paths", () => {
        beforeEach(() => {
          store.dispatch(subscribeToValues([]));
        });

        it("will not subscribe to any firebase refs", () => {
          expect(Object.keys(refs).length).toBe(0);
          expect(firebase.database().ref).not.toHaveBeenCalled();
        });

        it("will not dispatch any redux actions", () => {
          expect(dispatchedActions).toEqual([]);
        });
      });

    });

    describe("The unsubscribeFromValues() action creator", () => {
      describe("when unsubscribing from paths that are not currently subscribed to", () => {
        beforeEach(() => {
          store.dispatch(unsubscribeFromValues(['/not-current-subscribed']));
        });

        it("will not dispatch any actions", () => {
          expect(dispatchedActions).toEqual([]);
        });
      });

      describe("when unsubscribing from paths that are currently subscribed to", () => {
        beforeEach(() => {
          store.dispatch(subscribeToValues(['/foo']));
          dispatchedActions = [];
          store.dispatch(unsubscribeFromValues(['/foo', '/bar']));
        });

        it("will dispatch a FIREBASE/UNSUBSCRIBE_FROM_VALUES action", () => {
          expect(dispatchedActions).toEqual([{
            type: "FIREBASE/UNSUBSCRIBE_FROM_VALUES",
            paths: ['/foo'],
          }]);
        });

        it("will call the off() method on the firebase ref", () => {
          expect(refs['/foo'].off).toHaveBeenCalledWith('value');
        });
      });

    });

  });
});
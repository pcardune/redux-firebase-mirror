import cachingStorageReducer from '../cachingStorageReducer';
import * as Immutable from 'immutable';
import {RECEIVE_SNAPSHOTS, SUBSCRIBE_TO_VALUES} from '../constants';

describe('cachingStorageReducer', () => {
  let reducer, state;
  beforeEach(() => {
    reducer = cachingStorageReducer();
    global.localStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
    };
    state = Immutable.fromJS({mirror: {}, subscriptions: {}});
  });

  it('returns a reducer function', () => {
    expect(reducer).toEqual(jasmine.any(Function));
  });

  describe('the reducer function', () => {
    it('will ignore action types it does not know about', () => {
      expect(reducer(state, {type: 'UNKNOWN'}).equals(state)).toBe(true);
    });

    it('will populate local storage with received snapshot values', () => {
      reducer(undefined, {
        type: RECEIVE_SNAPSHOTS,
        values: {
          'foo/bar': {id: 1, name: 'paul'},
        },
      });
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'firebase-mirror:foo/bar',
        '{"id":1,"name":"paul"}'
      );
    });

    xit(
      'will populate the state with values read from local storage when subscribing to values',
      () => {
        global.localStorage.getItem.mockImplementation(key => {
          return {
            'foo/bar': '{"id":1,"name":"paul"}',
            baz: 'bad json',
          }[key];
        });
        state = reducer(state, {
          type: SUBSCRIBE_TO_VALUES,
          paths: ['foo/bar', 'baz', 'zoo'],
        });
        expect(state.toJS()).toEqual({
          mirror: {
            foo: {
              bar: {id: 1, name: 'paul'},
            },
          },
          subscriptions: {},
        });
      }
    );
  });
});

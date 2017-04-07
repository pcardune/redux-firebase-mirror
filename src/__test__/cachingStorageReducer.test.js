import cachingStorageReducer from '../cachingStorageReducer';
import * as Immutable from 'immutable';
import {RECEIVE_SNAPSHOT, SUBSCRIBE_TO_VALUES} from '../actions';

describe('cachingStorageReducer', () => {
  let reducer;
  beforeEach(() => {
    reducer = cachingStorageReducer();
    global.localStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
    };
  });

  it("returns a reducer function", () => {
    expect(reducer).toEqual(jasmine.any(Function));
  });

  describe("the reducer function", () => {
    it("will ignore action types it does not know about", () => {
      let state = Immutable.Map();
      expect(reducer(state, {type: 'UNKNOWN'})).toBe(state);
    });
    it("will populate local storage with received snapshot values", () => {
      reducer(undefined, {type: RECEIVE_SNAPSHOT, path: 'foo/bar', value: {id: 1, name: "paul"}});
      expect(global.localStorage.setItem).toHaveBeenCalledWith('foo/bar', '{"id":1,"name":"paul"}');
    });

    it("will populate the state with values read from local storage when subscribing to values", () => {
      global.localStorage.getItem.mockImplementation((key) => {
        return {
          "foo/bar": '{"id":1,"name":"paul"}',
          "baz": 'bad json',
        }[key];
      });
      const state = reducer(undefined, {type: SUBSCRIBE_TO_VALUES, paths: ['foo/bar', 'baz', 'zoo']});
      expect(state.toJS()).toEqual({
        mirror: {
          foo: {
            bar: {id: 1, name: "paul"},
          },
        },
      });
    });
  });
});

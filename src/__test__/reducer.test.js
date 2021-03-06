import {SUBSCRIBE_TO_VALUES, RECEIVE_SNAPSHOTS} from '../constants';
import immutableStorage from '../immutableStorage';
import {isSubscribedToValue, hasReceivedValue} from '../selectors';
import reducer from '../reducer';
import {mockDate, restoreDate} from './mockDate';
import {CONFIG} from '../config';

describe('The reducer module', () => {
  let reduce, state, time;

  beforeAll(() => {
    reduce = reducer(immutableStorage);
    mockDate(() => time);
    CONFIG.getFirebaseState = state => state;
  });

  afterAll(() => {
    restoreDate();
  });

  beforeEach(() => {
    time = 1451606400000;
    state = reduce(undefined, {});
  });

  it('initializes the state to an Immutable Map', () => {
    expect(state.toJS()).toEqual({
      subscriptions: {},
      mirror: {},
    });
  });

  describe('when given a RECEIVE_SNAPSHOTS action', () => {
    beforeEach(() => {
      state = state.setIn(
        ['subscriptions', 'baz|3|||10||true||', 'time'],
        new Date().getTime()
      );
      state = reduce(state, {
        type: RECEIVE_SNAPSHOTS,
        values: {
          'foo/bar': {
            pathSpec: 'foo/bar',
            value: {name: 'Foo bar', createdOn: 12345},
          },
          'baz/child-5': {
            pathSpec: 'baz/child5',
            value: 'baz-5',
          },
          'baz|3|||10||true||': {
            pathSpec: {
              filter: {limitToLast: 3, startAt: 10},
              orderByKey: true,
              path: 'baz',
            },
            value: {child1: 'baz-1', child2: 'baz-2', child3: 'baz-3'},
          },
        },
      });
    });

    it('will store the data in the mirror', () => {
      expect(state.get('mirror').toJS()).toEqual({
        baz: {
          child1: 'baz-1',
          child2: 'baz-2',
          child3: 'baz-3',
          child5: 'baz-5',
        },
        foo: {bar: {createdOn: 12345, name: 'Foo bar'}},
      });
    });

    it('will not make isSubscribedToValue return true if there was never a subscription', () => {
      expect(isSubscribedToValue(state, 'foo/bar')).toBe(false);
      expect(isSubscribedToValue(state, 'baz|3|||10||true||')).toBe(true);
    });

    it('will make hasReceivedValue return true', () => {
      expect(hasReceivedValue(state, 'foo/bar')).toBe(true);
      expect(
        hasReceivedValue(state, {
          filter: {limitToLast: 3, startAt: 10},
          orderByKey: true,
          path: 'baz',
        })
      ).toBe(true);
    });

    it('will update the subscription with the last update time', () => {
      expect(state.get('subscriptions').toJS()).toEqual({
        'baz/child5': {lastUpdateTime: 1451606400000},
        'foo/bar': {lastUpdateTime: 1451606400000},
        'baz|3|||10||true||': {
          lastUpdateTime: 1451606400000,
          time: 1451606400000,
        },
      });
    });

    describe('when a received value is subsequently subscribed to', () => {
      beforeEach(() => {
        state = reduce(state, {
          type: SUBSCRIBE_TO_VALUES,
          paths: ['foo/bar'],
        });
      });
      it('will update the subscription with the time the subscription was made', () => {
        expect(state.get('subscriptions').toJS()).toEqual({
          'baz/child5': {lastUpdateTime: 1451606400000},
          'baz|3|||10||true||': {
            lastUpdateTime: 1451606400000,
            time: 1451606400000,
          },
          'foo/bar': {lastUpdateTime: 1451606400000, time: 1451606400000},
        });
      });
    });
  });

  describe('when given a SUBCRIBE_TO_VALUES action', () => {
    beforeEach(() => {
      state = reduce(state, {
        type: SUBSCRIBE_TO_VALUES,
        paths: ['foo/bar', 'items/1'],
      });
    });

    it('will update the subscription state with each of the paths', () => {
      expect(state.toJS()).toEqual({
        subscriptions: {
          'foo/bar': {
            time: 1451606400000,
          },
          'items/1': {
            time: 1451606400000,
          },
        },
        mirror: {},
      });
    });

    it('will make hasReceivedValue return false', () => {
      expect(hasReceivedValue(state, 'foo/bar')).toBe(false);
    });

    describe('when subsequently given a RECEIVE_SNAPSHOTS', () => {
      beforeEach(() => {
        time += 1000;
        state = reduce(state, {
          type: RECEIVE_SNAPSHOTS,
          values: {
            'foo/bar': {
              pathSpec: 'foo/bar',
              value: {
                name: 'Foo Bar',
                createdOn: 12345,
              },
            },
          },
        });
      });

      it('will update the mirror with the provided values', () => {
        expect(state.get('mirror').toJS()).toEqual({
          foo: {
            bar: {
              name: 'Foo Bar',
              createdOn: 12345,
            },
          },
        });
      });

      it('will make hasReceivedValue return false', () => {
        expect(hasReceivedValue(state, 'foo/bar')).toBe(true);
      });

      it('will update the subscription with the last update time', () => {
        expect(state.get('subscriptions').toJS()).toEqual({
          'foo/bar': {
            lastUpdateTime: 1451606401000,
            time: 1451606400000,
          },
          'items/1': {
            time: 1451606400000,
          },
        });
      });
    });
  });
});

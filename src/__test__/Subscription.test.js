import Subscription from '../Subscription';
import * as actions from '../actions';

jest.mock('../actions');

describe('Subscription', () => {
  let paths, value, sub;
  beforeEach(() => {
    paths = jest.fn((state, {fooId}) => [`path/to/${fooId}`]);
    value = jest.fn((state, {fooId}) => `value of ${fooId}`);
    sub = new Subscription({paths, value});
  });

  it('takes in an object with a paths and value function', () => {
    expect(sub.paths).toBe(paths);
    expect(sub.value).toBe(value);
  });

  describe('Subscription.mapProps()', () => {
    it('takes in a mapping function from set of props to another and returns a new subscription', () => {
      const mapper = ({id}) => ({fooId: id});
      const newSub = sub.mapProps(mapper);
      expect(newSub).toBeInstanceOf(Subscription);
      expect(newSub.paths(null, {id: 1})).toEqual(['path/to/1']);
      expect(newSub.value(null, {id: 1})).toEqual('value of 1');
    });
  });

  describe('Subscription.fetchNow()', () => {
    it('returns a promise that only resolves once everything has been fetched', () => {
      const store = {
        dispatch: jest.fn(a => a()),
        getState: jest.fn(),
      };

      paths.mockImplementation(() => ['first']);

      const fetchAction = () =>
        new Promise(resolve => {
          paths.mockImplementation(() => ['first', 'second']);
          resolve();
        });
      actions.fetchValues.mockReturnValue(fetchAction);

      const resultPromise = sub.fetchNow(store, {fooId: 3});
      expect(actions.fetchValues.mock.calls.length).toBe(1);
      expect(actions.fetchValues.mock.calls[0]).toEqual([['first']]);
      expect(store.dispatch).toHaveBeenCalledWith(fetchAction);
      expect(resultPromise).toBeInstanceOf(Promise);
      return resultPromise.then(result => {
        expect(actions.fetchValues.mock.calls.length).toBe(2);
        expect(actions.fetchValues.mock.calls[1]).toEqual([
          ['first', 'second'],
        ]);
        expect(result).toBe('value of 3');
      });
    });
  });
});

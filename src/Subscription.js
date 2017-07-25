//@flow
import type {Store} from 'redux';
import * as Immutable from 'immutable';
import * as actions from './actions';

export default class Subscription<S, P, R> {
  paths: (state: S, props: P) => string[];
  value: (state: S, props: P) => R;

  constructor(props: {
    paths: (state: S, props: P) => string[],
    value: (state: S, props: P) => R,
  }) {
    this.paths = props.paths;
    this.value = props.value;
  }

  mapProps<NP>(mapper: (newProps: NP) => P) {
    const newSubscription: Subscription<S, NP, R> = new Subscription({
      paths: (state: S, newProps: NP) => this.paths(state, mapper(newProps)),
      value: (state: S, newProps: NP) => this.value(state, mapper(newProps)),
    });
    return newSubscription;
  }

  fetchNow(store: Store<*, *>, props: P): Promise<R> {
    return new Promise(resolve => {
      let paths = Immutable.Set(this.paths(store.getState(), props));
      store.dispatch(actions.fetchValues(paths.toJS())).then(() => {
        let newPaths = Immutable.Set(this.paths(store.getState(), props));
        if (newPaths.subtract(paths).size == 0) {
          resolve(this.value(store.getState(), props));
        } else {
          this.fetchNow(store, props).then(resolve);
        }
      });
    });
  }
}

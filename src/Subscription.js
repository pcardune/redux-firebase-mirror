//@flow
import type {Store} from 'redux';
import * as Immutable from 'immutable';
import * as actions from './actions';

export class Subscription<S, P, R> {

  paths: (state: S, props: P) => string[];
  value: (state: S, props: P) => R;

  constructor(props: {paths: (state: S, props: P) => string[], value: (state: S, props: P) => R}) {
    this.paths = props.paths;
    this.value = props.value;
  }

  fetchNow(store: Store<*, *>, props: P): Promise<R> {
    return new Promise((resolve) => {
      let paths = Immutable.Set(this.paths(store.getState(), props));
      store.dispatch(
        actions.fetchValues(paths.toJS(), () => {
          let newPaths = Immutable.Set(this.paths(store.getState(), props));
          if (newPaths.subtract(paths).size == 0) {
            resolve(this.value(store.getState(), props));
          } else {
            this.fetchNow(store, props).then(resolve);
          }
        })
      );
    });
  }
}

//@flow
import * as Immutable from 'immutable';
import type {JSONType, StorageAPI} from './types';

type MirrorType = Immutable.Map<string, mixed>;
type ValueType = mixed;

const immutableStorage: StorageAPI<MirrorType, ValueType> = {
  getKeysAtPath(mirror: MirrorType, path: string): string[] {
    const map = mirror.getIn(path.split('/'), Immutable.Map());
    if (!(map instanceof Immutable.Map)) {
      return [];
    }
    return map.keySeq().toArray();
  },

  getValueAtPath(mirror: MirrorType, path: string): ValueType {
    return mirror.getIn(path.split('/'));
  },

  setValues(mirror: MirrorType, values: {[path: string]: JSONType}): MirrorType {
    return mirror.withMutations((mirror) => {
      Object.entries(values).forEach(([path, value]) => {
        mirror.setIn(path.split('/'), Immutable.fromJS(value));
      });
      return mirror;
    });
  },

  getInitialMirror(): MirrorType {
    return Immutable.Map();
  },
};

export default immutableStorage;

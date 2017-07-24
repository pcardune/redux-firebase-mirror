//@flow
import * as Immutable from 'immutable';
import type {JSONType, StorageAPI} from './types';
import {splitPath} from './util';

type MirrorType = Immutable.Map<string, mixed>;
type ValueType = mixed;

const immutableStorage: StorageAPI<MirrorType, ValueType> = {
  getKeysAtPath(mirror: MirrorType, path: string): string[] {
    const map = mirror.getIn(splitPath(path), Immutable.Map());
    if (!(map instanceof Immutable.Map)) {
      return [];
    }
    return map.keySeq().toArray();
  },

  getValueAtPath(mirror: MirrorType, path: string): ValueType {
    return mirror.getIn(splitPath(path));
  },

  setValues(
    mirror: MirrorType,
    values: {[path: string]: JSONType}
  ): MirrorType {
    return mirror.withMutations(mirror => {
      Object.entries(values).forEach(([path, value]) => {
        mirror.setIn(splitPath(path), Immutable.fromJS(value));
      });
      return mirror;
    });
  },

  getInitialMirror(): MirrorType {
    return Immutable.Map();
  },
};

export default immutableStorage;

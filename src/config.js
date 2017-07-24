import immutableStorage from './immutableStorage';

const DEFAULT_MOUNT_KEY = 'firebaseMirror';

export const DEFAULT_CONFIG = {
  storageAPI: immutableStorage,
  getFirebaseState(state) {
    if (!state[DEFAULT_MOUNT_KEY]) {
      throw new Error(
        `redux-firebase-mirror's reducer must be mounted with combineReducers() under the '${DEFAULT_MOUNT_KEY}' key`
      );
    }
    return state[DEFAULT_MOUNT_KEY];
  },
  persistToLocalStorage: false,
};

export const CONFIG = {...DEFAULT_CONFIG};

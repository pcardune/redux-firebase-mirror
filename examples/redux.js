import reduxFirebaseMirror, {getKeysAtPath, getValueAtPath, Subscription} from 'redux-firebase-mirror';

export const firebaseMirror = reduxFirebaseMirror();

export const toDoIds = new Subscription({
  paths: () => ['/todos'],
  value: (state) => getKeysAtPath(state, '/todos')
});

export const numToDos = new Subscription({
  paths: toDoIds.paths,
  value: (state) => toDoIds.value(state).length,
});

export const toDoFromId = new Subscription({
  paths: (state, {toDoId}) => [`/todos/${toDoId}`],
  value: (state, {toDoId}) => getValueAtPath(state, `/todos/${toDoId}`),
});

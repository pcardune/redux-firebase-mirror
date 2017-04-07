import reduxFirebaseMirror from '../src/index';
import Subscription from '../src/Subscription';

export const firebaseMirror = reduxFirebaseMirror();

export const toDoIds = new Subscription({
  paths: () => ['/todos'],
  value: (state) => firebaseMirror.selectors.getKeysAtPath(state, '/todos')
});

export const numToDos = new Subscription({
  paths: toDoIds.paths,
  value: (state) => toDoIds.value(state).length,
});

export const toDoFromId = new Subscription({
  paths: (state, {toDoId}) => [`/todos/${toDoId}`],
  value: (state, {toDoId}) => firebaseMirror.selectors.getValueAtPath(state, `/todos/${toDoId}`),
});

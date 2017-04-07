import React from 'react';
import ReactDOM from 'react-dom';
import {createStore, applyMiddleware, combineReducers} from 'redux';
import {Provider} from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import firebase from 'firebase';
import logger from 'redux-logger';
import reduxFirebaseMirror from 'redux-firebase-mirror';

import firebaseKeys from '../firebaseKeys.json';
import ToDoApp from './ToDoApp';

firebase.initializeApp(firebaseKeys);

const store = createStore(
  combineReducers({firebaseMirror: reduxFirebaseMirror()}),
  applyMiddleware(thunkMiddleware, logger)
);

const container = document.createElement('div');
document.body.appendChild(container);
ReactDOM.render(
  <Provider store={store}>
    <ToDoApp />
  </Provider>,
  container
);

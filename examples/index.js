import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import {createStore, applyMiddleware, combineReducers} from 'redux';
import {Provider} from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import firebase from 'firebase';
import logger from 'redux-logger'


import firebaseKeys from '../firebaseKeys.json';
import {firebaseMirror} from './redux';
import ToDoApp from './ToDoApp';

firebase.initializeApp(firebaseKeys);

const store = createStore(
  combineReducers({firebaseMirror: firebaseMirror.reducer}),
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

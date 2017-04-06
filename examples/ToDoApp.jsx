import React, {Component} from 'react';
import {compose} from 'redux';
import {connect} from 'react-redux';
import {subscribePaths} from '../src/hoc';

import {numToDos} from './redux';
import ToDoList from './ToDoList';

export default compose(
  subscribePaths(
    (state, {id}) => [
      ...numToDos.paths(state, {id}),
    ],
  ),
  connect(
    (state, {id}) => ({
      numToDos: numToDos.value(state, {id}),
    })
  ),
)(class ToDoApp extends Component {
  render() {
    return (
      <div>
        <h1>{this.props.numToDos} To Dos</h1>
        <ToDoList />
      </div>
    );
  }
});

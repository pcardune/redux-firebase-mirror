import React, {Component} from 'react';
import {compose} from 'redux';
import {connect} from 'react-redux';
import {getKeysAtPath, subscribePaths} from 'redux-firebase-mirror';

import AddToDoForm from './AddToDoForm';
import ToDoListItem from './ToDoListItem';

export default compose(
  subscribePaths((state, ownProps) => ['/todos']),
  connect(state => ({
    todoIds: getKeysAtPath(state, '/todos'),
  }))
)(
  class ToDoList extends Component {
    render() {
      return (
        <ul>
          {this.props.todoIds.map(id =>
            <li key={id}>
              <ToDoListItem id={id} />
            </li>
          )}
          <AddToDoForm />
        </ul>
      );
    }
  }
);

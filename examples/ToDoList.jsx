import React, {Component} from 'react';
import {compose} from 'redux';
import {connect} from 'react-redux';
import {subscribePaths} from '../src/react';

import AddToDoForm from './AddToDoForm';
import ToDoListItem from './ToDoListItem';
import {firebaseMirror} from './redux';

export default compose(
  subscribePaths(
    (state, ownProps) => ['/todos']
  ),
  connect(
    state => ({
      todoIds: firebaseMirror.selectors.getKeysAtPath(state, '/todos')
    })
  ),
)(class ToDoList extends Component {
  render() {
    return (
      <ul>
        {this.props.todoIds.map(id => (
           <li key={id}>
             <ToDoListItem  id={id} />
           </li>
        ))}
        <AddToDoForm />
      </ul>
    );
  }
});

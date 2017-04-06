import React, {Component} from 'react';
import {compose} from 'redux';
import {connect} from 'react-redux';
import firebase from 'firebase';
import {subscribeProps} from '../src/hoc';

import {toDoFromId} from './redux';


export default subscribeProps({
  toDo: toDoFromId.mapProps(({id}) => ({toDoId: id})),
})(class ToDoListItem extends Component {
  onChangeCompleted = (e) => {
    firebase.database().ref(`todos/${this.props.id}`).update({completed: e.target.checked});
  }
  render() {
    return (
      <label>
        <input type="checkbox" checked={this.props.toDo.get('completed')} onChange={this.onChangeCompleted} />
        {' '}
        {this.props.toDo.get('text')}
      </label>
    );
  }
});

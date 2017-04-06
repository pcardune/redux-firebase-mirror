import React, {Component} from 'react';
import firebase from 'firebase';

export default class AddToDoForm extends Component {
  state = {
    text: '',
  };

  onChangeText = (e) => {
    this.setState({text: e.target.value});
  };

  onClickAdd = () => {
    firebase.database().ref('todos').push({
      text: this.state.text,
    });
  };

  render() {
    return (
      <div>
        <input type="text" value={this.state.text} onChange={this.onChangeText} />
        <button onClick={this.onClickAdd}>Add</button>
      </div>
    );
  }
}

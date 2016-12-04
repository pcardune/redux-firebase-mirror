//@flow
import * as reduxFirebaseMirror from '../index';
import * as actions from '../actions';

describe("The redux-firebase-mirror module", () => {
  it("should export all the functions from the actions module", () => {
    Object.keys(actions).forEach(key => expect(reduxFirebaseMirror[key]).toBe(actions[key]));
  });
});

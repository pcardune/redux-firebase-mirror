const _Date = Date;
export function mockDate(getTime) {
  global.Date = jest.fn(() => new _Date(getTime()));
  global.Date.UTC = _Date.UTC;
  global.Date.parse = _Date.parse;
  global.Date.now = _Date.now;
}

export function restoreDate(time) {
  global.Date = _Date;
}

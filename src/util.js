export function normalizePath(path) {
  if (path[0] === '/') {
    // remove leading slash
    path = path.slice(1);
  }

  if (path[path.length - 1] === '/') {
    // remove trailing slash
    path = path.slice(0, path.length - 1);
  }
  return path;
}

export function getPathSpecKey(pathSpec) {
  if (typeof pathSpec === 'string') {
    return normalizePath(pathSpec);
  }
  const {path, filter = {}, orderByKey, orderByChild, orderByValue} = pathSpec;
  const {limitToLast, limitToFirst, endAt, startAt, equalTo} = filter;
  return [
    normalizePath(path),
    limitToLast,
    limitToFirst,
    endAt,
    startAt,
    equalTo,
    orderByKey,
    orderByChild,
    orderByValue,
  ].join('|');
}

export function splitPath(path) {
  return normalizePath(path).split('/');
}

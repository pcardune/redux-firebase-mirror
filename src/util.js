export function splitPath(path) {
  if (path[0] === '/') {
    // remove leading slash
    path = path.slice(1);
  }

  if (path[path.length - 1] === '/') {
    // remove trailing slash
    path = path.slice(0, path.length - 1);
  }

  return path.split('/');
}

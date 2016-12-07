//@flow

export type JSONType = | string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONType };
type JSONArray = Array<JSONType>;

export interface StorageAPI<M, V> {
  getKeysAtPath(mirror: M, path: string): string[];
  getValueAtPath(mirror: M, path: string): V;
  setValues(mirror: M, values: {[path: string]: JSONType}): M;
  getInitialMirror(): M;
}

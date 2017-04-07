import {splitPath} from '../util';

describe("the util module", () => {
  describe('splitPath()', () => {
    it("strips leading slashes", () => {
      expect(splitPath('/foo/bar')).toEqual(['foo','bar']);
    });
    it("strips trailing slashes", () => {
      expect(splitPath('foo/bar/')).toEqual(['foo','bar']);
    });
  });
});

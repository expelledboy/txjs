const { assocEvolve } = require("../utils.js");

describe("assocEvolve", () => {
  it("doesnt effect standard params", () => {
    const params = { a: 1, b: true, c: [] };
    expect(assocEvolve(params, {})).toEqual(params);
  });

  it("loads keys prefixed with _ to data object", () => {
    const params = {
      a_deep: { _val: "_[1]" },
      _a: "_[0].deep.nested[0]",
      b: true,
      b_deep: { _val: "_[1]" }
    };
    const data = [{ deep: { nested: ["list"] } }, false];
    expect(assocEvolve(params, data)).toEqual({
      a_deep: { val: false },
      a: "list",
      b: true,
      b_deep: { val: false }
    });
  });
});

const stringify = require("../../lib/stringify");
const expect = require("chai").expect;

describe("stringify", function() {
  it("should stringify an array", () => {
    expect(stringify([1, 2, "abc", () => 1, "999"])).to.equal(`[1,2,"abc","func","999"]`);
  });

  it("should catch throw and return error message", () => {
    const a = {};
    const b = {};
    a.b = b;
    b.a = a;
    expect(stringify(a)).to.equal("ERROR: Converting circular structure to JSON");
  });
});

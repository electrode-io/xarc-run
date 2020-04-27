"use strict";

const updateEnv = require("../../lib/util/update-env");
const expect = require("chai").expect;

describe("update env", function() {
  it("should handle falsy value", () => {
    expect(updateEnv(null, { a: 1 })).to.deep.equal({ a: 1 });
  });

  it("should update and delete entries", () => {
    expect(
      updateEnv(
        { A: 50, B: null, C: undefined, D: 90 },
        {
          A: 1,
          B: 3,
          C: 4
        }
      )
    ).to.deep.equal({ A: 50, D: 90 });
  });

  it("should update process.env by default", () => {
    process.env.H = "O";
    updateEnv({ FOO: "bar", H: undefined });
    expect(process.env.FOO).to.equal("bar");
    expect(process.env.H).to.equal(undefined);
    delete process.env.FOO;
  });

  it("should avoid replacing if override is false", () => {
    const target = { FOO: "blah", TEST: "xyz" };
    updateEnv({ HELLO: "world", FOO: "bar", TEST: null }, target, false);
    expect(target).to.deep.equal({
      FOO: "blah",
      TEST: "xyz",
      HELLO: "world"
    });
  });
});

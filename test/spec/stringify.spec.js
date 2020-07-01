"use strict";

const stringify = require("../../lib/stringify");
const expect = require("chai").expect;
const xrun = require("../..");

describe("stringify", function() {
  it("should stringify an array", () => {
    expect(stringify([Symbol("concurrent"), 1, 2, "abc", () => 1, "999"])).to.equal(
      `["<concurrent>",1,2,"abc","func","999"]`
    );
  });

  it("should stringify XTaskSpec", () => {
    expect(
      stringify({
        x: xrun.exec("hello", "tty")
      })
    ).to.equal(`{"x":"exec(tty) 'hello'"}`);
  });

  it("should catch throw and return error message", () => {
    const a = {};
    const b = {};
    a.b = b;
    b.a = a;
    expect(stringify(a)).includes("ERROR: Converting circular structure to JSON");
  });
});

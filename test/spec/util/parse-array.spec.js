"use strict";

const parseArray = require("../../../lib/util/parse-array");
const xstdout = require("xstdout");
const expect = require("chai").expect;

describe("parse-array", function() {
  it("should handle nesting complex arrays", () => {
    const arr = parseArray("[[.,a, b, c, [d, [1, 2, [3, 4]], e], f, [g]]]");
    expect(arr).to.deep.equal([
      [".", "a", "b", "c", ["d", ["1", "2", ["3", "4"]], "e"], "f", ["g"]]
    ]);
  });

  it("should return [] for empty string", () => {
    expect(parseArray("  ")).to.deep.equal([]);
  });

  it("should handle simple nesting array", () => {
    expect(parseArray("[[[a]]]")).to.deep.equal([[["a"]]]);
  });

  it("should handle simple single element array", () => {
    expect(parseArray("[123]")).to.deep.equal(["123"]);
  });

  it("should handle trailing ,", () => {
    expect(parseArray("[123,]")).to.deep.equal(["123"]);
  });

  it("should dangling ,", () => {
    expect(parseArray("[ ,]")).to.deep.equal([]);
  });

  it("should handle empty nesting arrays", () => {
    expect(parseArray("[123,[a],b,c,[],[],[555]]")).to.deep.equal([
      "123",
      ["a"],
      "b",
      "c",
      [],
      [],
      ["555"]
    ]);
  });

  it("should handle extra spaces", () => {
    expect(
      parseArray("[ [    [ a  , ] , b ,   [ , [  c]  ,d , [ e, ] , h ,f  ,g ]]]")
    ).to.deep.equal([[["a"], "b", [["c"], "d", ["e"], "h", "f", "g"]]]);
  });
});

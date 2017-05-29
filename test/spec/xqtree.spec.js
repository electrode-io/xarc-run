"use strict";

const XQTree = require("../../lib/xqtree");
const expect = require("chai").expect;

describe("xqtree", function() {
  it("should create an item and add it to parent", () => {
    const xqtree = new XQTree();
    const a = xqtree.create({ name: "a" });
    a.level = undefined;
    const b = xqtree.create({ name: "b" }, a);
    expect(b.level).to.equal(0);
    expect(xqtree.parent(b)).to.equal(a);
  });

  it("parentName should resolve parent name", () => {
    const xqtree = new XQTree();
    const a = xqtree.create({ name: "a" });
    a.level = undefined;
    const b = xqtree.create({ name: "b" }, a);
    expect(xqtree.parentName(b)).to.equal("a");
  });

  it("should fail if creating an item w/o name", () => {
    const xqtree = new XQTree();
    expect(() => xqtree.create({})).to.throw(Error);
  });
});

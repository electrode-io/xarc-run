"use strict";

const NSOrder = require("../../lib/ns-order");
const expect = require("chai").expect;

describe("ns-order", function() {
  it("should order namespaces according to overrides specs", () => {
    const nsOrder = new NSOrder();
    const a = nsOrder.add("hello");
    expect(a).to.deep.equal(["hello"]);
    const b = nsOrder.add("world");
    expect(b).to.deep.equal(["hello", "world"]);
    const c = nsOrder.add("foo", "hello");
    expect(c).to.deep.equal(["foo", "hello", "world"]);
    nsOrder.add("bar", ["hello", "world"]);
    const d = nsOrder.add("bar", "blah");
    expect(d).to.deep.equal(["foo", "bar", "hello", "world"]);
    const e = nsOrder.add("blah", "foo");
    expect(e).to.deep.equal(["bar", "blah", "foo", "hello", "world"]);
  });

  it("should detect first level circular override", () => {
    const nsOrder = new NSOrder();
    nsOrder.add("hello", "world");
    expect(() => nsOrder.add("world", "hello")).to.throw(
      "circular namespace override between 'world' and 'hello'"
    );
  });

  it("should detect non first level circular override", () => {
    const nsOrder = new NSOrder();
    nsOrder.add("hello", "world");
    nsOrder.add("world", "blah");
    expect(() => nsOrder.add("blah", "hello")).to.throw("there may be circular overrides");
  });
});

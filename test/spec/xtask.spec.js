"use strict";

const XTasks = require("../../lib/xtasks");
const expect = require("chai").expect;
const sample1 = require("../fixtures/sample1");

describe("xtasks", function() {
  it("should take no params in constructor", () => {
    const xtasks = new XTasks();
    expect(xtasks._tasks).to.exist;
  });

  const makeIt = () => {
    const xtasks = new XTasks("1", {
      foo1: "1-foo1",
      def1: "1-default1"
    });
    xtasks.load({
      def1: "default1"
    });
    xtasks.load("sample1", sample1);
    return xtasks;
  };

  it("should load tasks into custom namespace", () => {
    const xtasks = makeIt();
    expect(xtasks._tasks[1].foo1).to.equal("1-foo1");
  });

  it("should lookup task by name from first matching namespace", () => {
    const xtasks = makeIt();
    expect(xtasks.lookup("foo1")).to.equal("1-foo1");
  });

  it("should lookup task by name from default namespace", () => {
    const xtasks = makeIt();
    expect(xtasks.lookup("def1")).to.equal("default1");
    expect(xtasks.lookup(":def1")).to.equal("default1");
  });

  it("should lookup task by namespace:name", () => {
    const xtasks = makeIt();
    expect(xtasks.lookup("1:foo1")).to.equal("1-foo1");
    expect(xtasks.lookup("sample1:foo1")).to.equal("sample1-foo1");
  });
});

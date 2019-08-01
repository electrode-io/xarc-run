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
    expect(xtasks.lookup("foo1")).to.deep.equal({
      ns: "1",
      name: "foo1",
      item: "1-foo1",
      search: true
    });
  });

  it("should lookup task by name from default namespace", () => {
    const xtasks = makeIt();
    expect(xtasks.lookup("def1")).to.deep.equal({
      ns: "/",
      name: "def1",
      item: "default1",
      search: true
    });
    expect(xtasks.lookup("/def1")).to.deep.equal({ ns: "/", name: "def1", item: "default1" });
  });

  it("should lookup task by namespace/name", () => {
    const xtasks = makeIt();
    expect(xtasks.lookup("1/foo1")).to.deep.equal({ ns: "1", name: "foo1", item: "1-foo1" });
    expect(xtasks.lookup("sample1/foo1")).to.deep.equal({
      ns: "sample1",
      name: "foo1",
      item: "sample1-foo1"
    });
  });

  it("should return names", () => {
    const xtasks = makeIt();
    expect(xtasks.names()).to.deep.equal([
      "def1",
      "foo1",
      "def1",
      "xfoo1",
      "xfoo2",
      "xfoo3",
      "xfoo4",
      "a",
      "b",
      "c",
      "foo2a",
      "xerr",
      "foo2ba",
      "foo1",
      "foo2",
      "foo2b",
      "foo3Dep",
      "foo3",
      "foo4Dep",
      "foo4",
      "foo5a",
      "foo6",
      "foo7"
    ]);
  });

  it("should return full names", () => {
    const xtasks = makeIt();
    expect(xtasks.fullNames()).to.deep.equal([
      "/def1",
      "1/foo1",
      "1/def1",
      "sample1/xfoo1",
      "sample1/xfoo2",
      "sample1/xfoo3",
      "sample1/xfoo4",
      "sample1/a",
      "sample1/b",
      "sample1/c",
      "sample1/foo2a",
      "sample1/xerr",
      "sample1/foo2ba",
      "sample1/foo1",
      "sample1/foo2",
      "sample1/foo2b",
      "sample1/foo3Dep",
      "sample1/foo3",
      "sample1/foo4Dep",
      "sample1/foo4",
      "sample1/foo5a",
      "sample1/foo6",
      "sample1/foo7"
    ]);
  });
});

"use strict";

const XClap = require("../../lib/xclap");
const expect = require("chai").expect;
const interceptStdout = require("../intercept-stdout");

describe("xclap", function() {
  it("should lookup and exe a task as a function once", done => {
    let foo = 0;
    const xclap = new XClap({
      foo: () => foo++
    });
    const exeEvents = ["lookup", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      expect(data.qItem.name).to.equal("foo");
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(foo).to.equal(1);
      done();
    });
  });

  it("should exe task name return by function", done => {
    let foo = 0;
    const xclap = new XClap({
      foo: () => "foo2",
      foo2: () => foo++
    });
    const exeEvents = ["lookup", "function", "lookup", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo).to.equal(1);
      done();
    });
  });

  it("should exe task array return by function", done => {
    let foo2 = 0, foo3 = 0;
    const xclap = new XClap({
      foo: () => ["foo2", "foo3"],
      foo2: () => foo2++,
      foo3: () => foo3++
    });
    const exeEvents = ["lookup", "function", "concurrent-arr", "lookup", "lookup", "function", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo2).to.equal(1);
      expect(foo3).to.equal(1);
      done(err);
    });
  });

  it("should exe function return by function", done => {
    let foo = 0;
    const xclap = new XClap({
      foo: () => () => foo++
    });
    const exeEvents = ["lookup", "function", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo).to.equal(1);
      done(err);
    });
  });

  it("should execute a dep string as shell directly", done => {
    let foo = 0;
    const xclap = new XClap({
      foo: {
        dep: "set a=0",
        task: () => foo++
      }
    });
    const exeEvents = ["lookup", "shell", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo).to.equal(1);
      done(err);
    });
  });

  it("should execute a dep function directly", done => {
    let foo = 0, dep = 0;
    const xclap = new XClap({
      foo: {
        dep: () => dep++,
        task: () => foo++
      }
    });
    const exeEvents = ["lookup", "function", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(dep).to.equal(1);
      expect(foo).to.equal(1);
      done(err);
    });
  });

  it("should execute a dep as serial array", done => {
    let foo = 0, foo2 = 0;
    const xclap = new XClap({
      foo: {
        dep: ["foo2"],
        task: () => foo++
      },
      foo2: () => foo2++
    });
    const exeEvents = ["lookup", "serial-arr", "lookup", "function", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo).to.equal(1);
      expect(foo2).to.equal(1);
      done(err);
    });
  });

  it("should execute a dep as serial and then concurrent array", done => {
    let foo = 0, foo2 = 0;
    const xclap = new XClap({
      foo: {
        dep: [["foo2"]],
        task: () => foo++
      },
      foo2: () => foo2++
    });
    const exeEvents = ["lookup", "serial-arr", "concurrent-arr", "lookup", "function", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo).to.equal(1);
      expect(foo2).to.equal(1);
      done(err);
    });
  });

  it("should await a promise a task function returned", done => {
    let foo2 = 0;
    const xclap = new XClap({
      foo: () => new Promise(resolve => setTimeout(() => resolve("foo2"), 10)),
      foo2: () => foo2++
    });

    const exeEvents = ["lookup", "function", "lookup", "function"];
    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo2).to.equal(1);
      done(err);
    });
  });

  it("should ignore value returned by task function that's not string/funciton/array", done => {
    let foo;
    const xclap = new XClap({
      foo: () => (foo = 999)
    });
    const exeEvents = ["lookup", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(foo).to.equal(999);
      done(err);
    });
  });

  it("should handle error from event handler", done => {
    const xclap = new XClap({
      foo: () => undefined
    });
    xclap.on("execute", data => {
      throw new Error("test");
    });
    xclap.run("foo", err => {
      expect(err).to.exist;
      done();
    });
  });

  it("should support load tasks", done => {
    const xclap = new XClap();
    xclap.load("1", {
      foo: () => {
        throw new Error("test");
      }
    });
    xclap.run("1:foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal("test");
      done();
    });
  });

  it("should handle direct error from exe a function task", done => {
    const xclap = new XClap({
      foo: () => {
        throw new Error("test");
      }
    });
    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal("test");
      done();
    });
  });

  it("should exit on error", done => {
    const intercept = interceptStdout.intercept(true);
    let testStatus;
    const ox = process.exit;
    process.exit = status => (testStatus = status);
    const xclap = new XClap({
      foo: () => {
        throw new Error("test");
      }
    });
    xclap.run("foo");
    setTimeout(() => {
      process.exit = ox;
      intercept.restore();
      expect(intercept.stdout.join()).include("execution failed, errors:");
      expect(testStatus).to.equal(1);
      done();
    }, 10);
  });

  it("should not exit on error if stopOnError is false", done => {
    const intercept = interceptStdout.intercept(true);
    let testStatus = "test";
    const ox = process.exit;
    process.exit = () => {
      testStatus = "called";
    };
    const xclap = new XClap({
      foo: () => {
        throw new Error("test");
      }
    });
    xclap.stopOnError = false;
    xclap.run("foo");
    setTimeout(() => {
      process.exit = ox;
      intercept.restore();
      expect(intercept.stdout.join()).include("execution failed, errors:");
      expect(testStatus).to.equal("test");
      done();
    }, 10);
  });

  it("_exitOnError should do nothing for no error", done => {
    const ox = process.exit;
    let testStatus = "test";
    process.exit = () => {
      testStatus = "called";
    };
    const xclap = new XClap();
    xclap._exitOnError();
    process.exit = ox;
    expect(testStatus).to.equal("test");
    done();
  });

  it("should fail for object task with unknown value type", done => {
    const xclap = new XClap({
      foo: ["foo2"],
      foo2: {
        desc: "foo2",
        task: true
      }
    });
    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal("Task foo2 has unrecognize task value type Boolean");
      done();
    });
  });

  it("should fail for task with unknown value type", done => {
    const xclap = new XClap({
      foo: [true]
    });
    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal(
        "Unable to process task foo.S because value type Boolean is unknown and no value.item"
      );
      done();
    });
  });
});

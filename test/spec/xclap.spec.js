"use strict";

const XClap = require("../../lib/xclap");
const expect = require("chai").expect;
const xstdout = require("xstdout");

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

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(doneItem).to.equal(1);
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

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(2);
      expect(foo).to.equal(1);
      done();
    });
  });

  it("should exe task array return by function", done => {
    let foo2 = 0,
      foo3 = 0;
    const xclap = new XClap({
      foo: () => ["foo2", "foo3"],
      foo2: () => foo2++,
      foo3: () => foo3++
    });
    const exeEvents = [
      "lookup",
      "function",
      "concurrent-arr",
      "lookup",
      "lookup",
      "function",
      "function"
    ];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(4);
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

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(2);
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

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(2);
      expect(foo).to.equal(1);
      done(err);
    });
  });

  it("should handle error from dep shell", done => {
    let foo = 0;
    const xclap = new XClap({
      foo: {
        dep: "exit 1",
        task: () => foo++
      }
    });
    const exeEvents = ["lookup", "shell", "function"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal("exit 1 exit code 1");
      expect(doneItem).to.equal(1);
      expect(foo).to.equal(0);
      done();
    });
  });

  it("should handle error from task shell", done => {
    const xclap = new XClap({
      foo: {
        task: "exit 1"
      }
    });
    const exeEvents = ["lookup", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal("exit 1 exit code 1");
      expect(doneItem).to.equal(1);
      done();
    });
  });

  it("should execute serial tasks", done => {
    let foo = 0;
    const xclap = new XClap({
      foo: [() => foo++, [".", "a", "b", "c"]],
      a: cb => process.nextTick(cb),
      b: cb => process.nextTick(cb),
      c: cb => process.nextTick(cb)
    });
    const exeEvents = [
      "lookup",
      "serial-arr",
      "function",
      "serial-arr",
      "lookup",
      "function",
      "lookup",
      "function",
      "lookup",
      "function"
    ];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(6);
      expect(foo).to.equal(1);
      done(err);
    });
  });

  it("should count tasks", () => {
    const xclap = new XClap();
    expect(xclap.countTasks()).to.equal(0);
    xclap.load({ foo: () => undefined });
    expect(xclap.countTasks()).to.equal(1);
    xclap.load("1", { foo: () => undefined, bar: () => undefined });
    expect(xclap.countTasks()).to.equal(3);
  });

  it("should handle top serial tasks with first dot", done => {
    let foo = 0;
    const xclap = new XClap({
      foo: [".", () => foo++, [".", "a", "b", "c"]],
      a: cb => process.nextTick(cb),
      b: cb => process.nextTick(cb),
      c: cb => process.nextTick(cb)
    });
    const exeEvents = [
      "lookup",
      "serial-arr",
      "function",
      "serial-arr",
      "lookup",
      "function",
      "lookup",
      "function",
      "lookup",
      "function"
    ];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(6);
      expect(foo).to.equal(1);
      done(err);
    });
  });

  it("should execute concurrent tasks", done => {
    let foo = 0,
      foo2 = 0;
    const xclap = new XClap({
      foo: [() => foo++, ["a", "b", () => foo2++, "c"]],
      a: cb => process.nextTick(cb),
      b: cb => process.nextTick(cb),
      c: cb => process.nextTick(cb)
    });
    const exeEvents = [
      "lookup",
      "serial-arr",
      "function",
      "concurrent-arr",
      "lookup",
      "lookup",
      "lookup",
      "function",
      "function",
      "function",
      "function"
    ];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(7);
      expect(foo).to.equal(1);
      expect(foo2).to.equal(1);
      done(err);
    });
  });

  it("should run a user array concurrently", done => {
    let foo = 0,
      foo2 = 0,
      fooX = 0;
    const xclap = new XClap({
      foo: [() => foo++, ["a", "b", () => foo2++, "c"]],
      fooX: cb => {
        fooX++;
        process.nextTick(cb);
      },
      a: cb => process.nextTick(cb),
      b: cb => process.nextTick(cb),
      c: cb => process.nextTick(cb)
    });
    const exeEvents = [
      "concurrent-arr",
      "lookup",
      "lookup",
      "serial-arr",
      "function",
      "function",
      "concurrent-arr",
      "lookup",
      "lookup",
      "lookup",
      "function",
      "function",
      "function",
      "function"
    ];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run(["foo", "fooX"], err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(9);
      expect(foo).to.equal(1);
      expect(foo2).to.equal(1);
      expect(fooX).to.equal(1);
      done(err);
    });
  });

  it("should return all errors from concurrent tasks", done => {
    let foo = 0,
      foo2 = 0;
    const xclap = new XClap({
      foo: [() => foo++, ["a", "b", () => foo2++, "c"]],
      a: cb => {
        throw new Error("a failed");
      },
      b: cb => setTimeout(() => process.nextTick(cb), 20),
      c: cb => {
        throw new Error("c failed");
      }
    });
    const exeEvents = [
      "lookup",
      "serial-arr",
      "function",
      "concurrent-arr",
      "lookup",
      "lookup",
      "lookup",
      "function",
      "function",
      "function",
      "function"
    ];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err.length).to.equal(2);
      expect(err[0].message).to.equal("a failed");
      expect(err[1].message).to.equal("c failed");
      expect(doneItem).to.equal(6);
      expect(foo).to.equal(1);
      expect(foo2).to.equal(1);
      xclap.waitAllPending(() => {
        expect(doneItem).to.equal(7);
        done();
      });
    });
  });

  it("should execute a dep function directly", done => {
    let foo = 0,
      dep = 0;
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

    let doneItem = 0;
    xclap.on("done-item", () => doneItem++);

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(2);
      expect(dep).to.equal(1);
      expect(foo).to.equal(1);
      done(err);
    });
  });

  it("should execute a dep as serial array", done => {
    let foo = 0,
      foo2 = 0;
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
    let foo = 0,
      foo2 = 0;
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

  it("should supply context as this to task function", done => {
    let foo = 0,
      foo3 = 0;
    const xclap = new XClap();
    xclap.load({
      foo2: {
        dep: "set a=0",
        task: ["foo3"]
      },
      foo3: [
        "~$set b=0",
        function() {
          this.run([".", "foo4", () => foo3++], err => foo++);
        }
      ],
      foo4: "set c=0"
    });
    const exeEvents = [
      "lookup",
      "shell",
      "serial-arr",
      "lookup",
      "serial-arr",
      "shell",
      "function",
      "serial-arr",
      "lookup",
      "shell",
      "function"
    ];
    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    xclap.run("foo2", err => {
      if (err) {
        return done(err);
      }
      expect(foo).to.equal(1);
      expect(foo3).to.equal(1);
      done();
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
    xclap.run(":1:foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal("test");
      done();
    });
  });

  it("should allow non-leading : in task names", done => {
    const xclap = new XClap();
    xclap.load("1", {
      "foo:bar": () => {
        throw new Error("test");
      }
    });
    xclap.run(":1:foo:bar", err => {
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
    const intercept = xstdout.intercept(true);
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
    const intercept = xstdout.intercept(true);
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

  it("should fail if task name is not found", done => {
    const xclap = new XClap({});
    xclap.run("foo", err => {
      expect(err[0].message).to.equal("Task foo not found");
      done();
    });
  });

  it("should fail if namespace is not found", done => {
    const xclap = new XClap({});
    xclap.run(":foo:bar", err => {
      expect(err[0].message).to.equal("No task namespace foo exist");
      done();
    });
  });

  it("should fail if task name is empty", done => {
    const xclap = new XClap({});
    xclap.run("", err => {
      expect(err[0].message).to.equal("xqitem must have a name");
      done();
    });
  });

  it("should fail if namespace is invalid", done => {
    const xclap = new XClap({});
    xclap.run("::bar", err => {
      expect(err[0].message).to.equal("Invalid namespace in task name ::bar");
      done();
    });
  });

  it("should fail if namespace doesn't exist", done => {
    const xclap = new XClap({});
    xclap.run(":foo:bar", err => {
      expect(err[0].message).to.equal("No task namespace foo exist");
      done();
    });
  });

  it("should fail if task is not in namespace", done => {
    const xclap = new XClap("foo", {
      test: () => undefined
    });
    xclap.run(":foo:bar", err => {
      expect(err[0].message).to.equal("Task bar in namespace foo not found");
      done();
    });
  });

  it("should fail if task is not in default namespace", done => {
    const xclap = new XClap({
      test: () => undefined
    });
    xclap.run(":bar", err => {
      expect(err[0].message).to.equal("Task bar in namespace : not found");
      done();
    });
  });
});

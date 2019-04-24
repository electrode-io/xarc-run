"use strict";

const gxclap = require("../..");
const XClap = require("../../lib/xclap");
const expect = require("chai").expect;
const xstdout = require("xstdout");
const chalk = require("chalk");
const assert = require("assert");
const logger = require("../../lib/logger");
const stripAnsi = require("strip-ansi");
const Munchy = require("munchy");
const { PassThrough } = require("stream");

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

  it("should pass task options as argv", done => {
    const xclap = new XClap({
      foo: function() {
        expect(this.argv).to.deep.equal(["foo"]);
      },
      foo1: function() {
        expect(this.argv).to.deep.equal(["foo1", "--test"]);
      },
      foo2: function() {
        expect(this.argv).to.deep.equal(["foo2", "--a", "--b"]);
      }
    });

    xclap.run(["foo", "foo1 --test", "foo2 --a --b"], err => {
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
      expect(err[0].message).to.equal("shell cmd 'exit 1' exit code 1");
      expect(doneItem).to.equal(1);
      expect(foo).to.equal(0);
      done();
    });
  });

  it("should execute shell with tty", done => {
    const xclap = new XClap({
      foo: `~(tty)$node -e "process.exit(process.stdout.isTTY ? 0 : 1)"`
    });
    const exeEvents = ["lookup", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(doneItem).to.equal(1);
      done();
    });
  });

  const execXTaskSpec = (flags, done) => {
    const xclap = new XClap({
      foo: gxclap.exec(`node -e "process.exit(process.stdout.isTTY ? 0 : 1)"`, { flags })
    });
    const exeEvents = ["lookup", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(doneItem).to.equal(1);
      done();
    });
  };

  it("should execute XTaskSpec shell with string tty flag", done => {
    execXTaskSpec("tty", done);
  });

  it("should execute XTaskSpec shell with array tty flag", done => {
    execXTaskSpec(["tty"], done);
  });

  it("should execute XTaskSpec shell with object tty flag", done => {
    execXTaskSpec({ tty: true }, done);
  });

  it("should execute XTaskSpec shell with npm flag", done => {
    execXTaskSpec({ npm: true }, done);
  });

  it("should execute anonymous XTaskSpec shell task", done => {
    const xclap = new XClap({
      foo: [gxclap.exec(`node -e "process.exit(process.stdout.isTTY ? 0 : 1)"`, "tty")]
    });
    const exeEvents = ["lookup", "serial-arr", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(doneItem).to.equal(2);
      done();
    });
  });

  it("should execute shell with spawn sync", done => {
    const xclap = new XClap({
      foo: `~(spawn,sync)$echo hello`
    });
    const exeEvents = ["lookup", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(doneItem).to.equal(1);
      done();
    });
  });

  it("should execute shell with spawn sync noenv", done => {
    process.env.FOO_NOENV = 1;
    const xclap = new XClap({
      foo: `~(spawn,sync,noenv)$exit $FOO_NOENV`
    });
    const exeEvents = ["lookup", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.not.exist;
      expect(doneItem).to.equal(1);
      done();
    });
  });

  it("should handle shell with unknown flag", done => {
    const xclap = new XClap({
      foo: `~(spawn,foo,sync)$echo hello`
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
      expect(doneItem).to.equal(0);
      expect(err[0].message).contains("Unknown flag foo in shell task");
      done();
    });
  });

  it("should handle XTaskSpec with unknown type", done => {
    const xclap = new XClap({
      foo: new gxclap.XTaskSpec({ type: "blah" })
    });

    xclap.run("foo", errors => {
      expect(errors).to.exist;
      expect(errors[0].message).include("Unable to process XTaskSpec type blah");
      done();
    });
  });

  it("should handle anonymous XTaskSpec with unknown type", done => {
    const xclap = new XClap({
      foo: [new gxclap.XTaskSpec({ type: "blah" })]
    });

    xclap.run("foo", errors => {
      expect(errors).to.exist;
      expect(errors[0].message).include("Unable to process XTaskSpec type blah");
      done();
    });
  });

  it("should handle fail status of shell with spawn", done => {
    const xclap = new XClap({ foo: `~(spawn)$node -e "process.exit(1)"` });
    const exeEvents = ["lookup", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal(`cmd "node -e "process.exit(1)"" exit code 1`);
      expect(doneItem).to.equal(1);
      done();
    });
  });

  it("should handle fail status of shell with spawn sync", done => {
    const xclap = new XClap({ foo: `~(spawn,sync)$node -e "process.exit(1)"` });
    const exeEvents = ["lookup", "shell"];

    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xclap.on("done-item", data => doneItem++);

    xclap.run("foo", err => {
      expect(err).to.exist;
      expect(err[0].message).to.equal(`cmd "node -e "process.exit(1)"" exit code 1`);
      expect(doneItem).to.equal(1);
      done();
    });
  });

  it("should handle error of shell with spawn sync", done => {
    const xclap = new XClap({
      foo: {
        options: { timeout: 10 },
        task: `~(spawn,sync)$sleep 1`
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
      expect(err[0].message).contains(`ETIMEDOUT`);
      expect(doneItem).to.equal(1);
      done();
    });
  });

  it("should handle error of shell command malformed", done => {
    const xclap = new XClap({
      foo: {
        options: { timeout: 10 },
        task: `~(spawn,syncsleep 1`
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
      expect(err[0].message).contains(`Missing )$ in shell task: ~(spawn,syncsleep 1`);
      expect(doneItem).to.equal(0);
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
      expect(err[0].message).to.equal("shell cmd 'exit 1' exit code 1");
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
      expect(doneItem).to.equal(7);
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

  it("should parse and execute array in a string", done => {
    let foo2 = 0,
      foo3 = 0;
    const xclap = new XClap({
      foo: {
        dep: "~[foo2]",
        task: "~[fooX, [foo2, fooX]]"
      },
      fooX: "~[fooY]",
      fooY: () => "~[foo2, foo3]",
      foo2: () => foo2++,
      foo3: () => foo3++
    });
    const exeEvents = [];

    xclap.on("execute", data => exeEvents.push(data.type));

    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(foo2).to.equal(4);
      expect(foo3).to.equal(2);
      expect(exeEvents).to.deep.equal([
        "lookup",
        "serial-arr",
        "lookup",
        "function",
        "serial-arr",
        "lookup",
        "serial-arr",
        "lookup",
        "function",
        "concurrent-arr",
        "lookup",
        "lookup",
        "function",
        "function",
        "concurrent-arr",
        "lookup",
        "lookup",
        "function",
        "serial-arr",
        "lookup",
        "function",
        "concurrent-arr",
        "lookup",
        "lookup",
        "function",
        "function"
      ]);
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
    xclap.run("1/foo", err => {
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
      expect(intercept.stdout.join()).include("Execution Failed - Errors:");
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
      expect(intercept.stdout.join()).include("Execution Failed - Errors:");
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

  it("should not fail if optional task name is not found", done => {
    const xclap = new XClap({});
    xclap.run("?foo", err => {
      expect(err).to.not.exist;
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

  it("should show similar tasks if not found", done => {
    const xclap = new XClap({
      ".foo": "",
      foo1: "",
      foo2: "",
      blah: "",
      test1: "",
      test2: "",
      test3: "",
      hello: "",
      moo: "",
      foo3: "",
      xoo: ""
    });
    const intercept = xstdout.intercept(true);
    try {
      xclap.exit = code => {
        intercept.restore();
        const stdout = intercept.stdout.map(l => stripAnsi(l));
        expect(stdout[2].trim()).to.equal("Maybe try: foo1, foo2, foo3, moo, xoo");
        done();
      };
      xclap.run("foox");
    } catch (e) {
      intercept.restore();
    }
  });

  it("should fail if namespace is not found", done => {
    const xclap = new XClap({});
    xclap.run("foo/bar", err => {
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

  it("should fail if task is not in namespace", done => {
    const xclap = new XClap("foo", {
      test: () => undefined
    });
    xclap.run("foo/bar", err => {
      expect(err[0].message).to.equal("Task bar in namespace foo not found");
      done();
    });
  });

  it("should fail if task is not in default namespace", done => {
    const xclap = new XClap({
      test: () => undefined
    });
    xclap.run("/bar", err => {
      expect(err[0].message).to.equal("Task bar in namespace / not found");
      done();
    });
  });

  describe("stopOnError", function() {
    it("should throw if value is invalid", () => {
      const xclap = new XClap();
      expect(() => (xclap.stopOnError = "blah")).to.throw("stopOnError must be");
    });

    it("should allow to set one of the string values", () => {
      const xclap = new XClap();
      xclap.stopOnError = "full";
      expect(xclap.stopOnError).to.equal("full");
    });
  });

  describe("_exitOnError", function() {
    let intercept;
    const xclap = new XClap();
    xclap.stopOnError = false;
    beforeEach(() => {
      chalk.enabled = false;
      intercept = xstdout.intercept(true);
    });
    afterEach(() => {
      chalk.enabled = true;
      intercept.restore();
    });

    it("should log err if it has no stack", () => {
      xclap._exitOnError("blah test");
      intercept.restore();
      expect(intercept.stdout.length).to.equal(2);
      expect(intercept.stdout[1]).to.equal(" 1  blah test\n");
    });

    it("should not log stack for AssertionError", () => {
      let err;
      try {
        assert(false, "blah test");
      } catch (e) {
        err = e;
      }
      xclap._exitOnError([err]);
      intercept.restore();
      expect(intercept.stdout.length).to.equal(2);
    });

    it("should not log stack if it's empty", () => {
      const err = {
        stack: "hello",
        message: "hello"
      };
      xclap._exitOnError([err]);
      intercept.restore();
      expect(intercept.stdout.length).to.equal(2);
    });

    it("should not log stack if it's shell exec failed", () => {
      const err = {
        stack: "hello\n  at ..../xsh/lib/exec.js:9:9",
        message: "hello"
      };
      xclap._exitOnError([err]);
      intercept.restore();
      expect(intercept.stdout.length).to.equal(2);
    });

    it("should handle err as non-array", () => {
      xclap._exitOnError(new Error("test 1"));
      intercept.restore();
      expect(intercept.stdout.length).to.be.above(2);
      expect(intercept.stdout[1]).include("1  test 1");
      expect(intercept.stdout[2]).include(" at ");
    });
  });

  it("getNamespaces should return namespaces in order of overrides", () => {
    const xclap = new XClap("test", {
      foo: () => undefined
    });
    xclap.load("blah", {});
    xclap.load({ namespace: "foo", overrides: "blah" }, {});
    xclap.load({ namespace: "blah", overrides: "hello" }, {});
    xclap.load("hello", {});
    expect(xclap.getNamespaces()).to.deep.equal(["/", "foo", "blah", "test", "hello"]);
  });

  it("should cancel and kill a shell exec on error", done => {
    const tasks = {
      sh: "sleep 1; echo sh output",
      fnErr: () => {
        throw new Error("error");
      }
    };

    const xclap = new XClap(tasks);
    const intercept = xstdout.intercept(true);
    xclap.run(["sh", "fnErr"], err => {
      setTimeout(() => {
        intercept.restore();
        expect(intercept.stdout).to.deep.equal([]);
        done();
      }, 1100);
    });
  });

  const timeoutFoo = x => {
    return new Promise(resolve => {
      setTimeout(resolve, x);
    });
  };

  const testAsync = (tasks, done) => {
    const xclap = new XClap(tasks);

    const exeEvents = ["lookup", "function", "lookup", "function"];
    xclap.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let cfoo2 = -1;
    setTimeout(() => (cfoo2 = tasks.foo2Value), 10);

    const start = Date.now();
    xclap.run("foo", err => {
      if (err) {
        return done(err);
      }
      const end = Date.now();
      expect(end - start).to.be.above(29);
      expect(cfoo2).to.equal(0);
      expect(tasks.foo2Value).to.equal(1);
      done(err);
    });
  };

  it("should handle async function", done => {
    const tasks = {
      foo2Value: 0,
      foo: async () => {
        await timeoutFoo(30);
        return "foo2";
      },
      foo2: () => tasks.foo2Value++
    };
    testAsync(tasks, done);
  });

  it("should handle async task function", done => {
    const tasks = {
      foo2Value: 0,
      foo: {
        task: async () => {
          await timeoutFoo(30);
          return "foo2";
        }
      },
      foo2: () => tasks.foo2Value++
    };
    testAsync(tasks, done);
  });

  const drainIt = munchy => {
    const data = [];
    const drain = new PassThrough();
    drain.on("data", x => {
      data.push(x);
    });
    munchy.pipe(drain);
    return { data, drain };
  };

  it("should handle function returning stream", done => {
    const tasks = {
      foo2Value: 0,
      foo: {
        task: () => {
          const m = new Munchy({}, "hello, world");
          setTimeout(() => {
            m.munch(null);
            tasks.foo2Value++;
            drainIt(m);
          }, 30);
          return m;
        }
      }
    };

    testAsync(tasks, done);
  });

  it("should handle function returning stream that fail", done => {
    const tasks = {
      foo2Value: 0,
      foo: {
        task: () => {
          const m = new Munchy({}, "hello, world");
          setTimeout(() => {
            tasks.foo2Value++;
            m.emit("error", new Error("test oops"));
          }, 30);
          return m;
        }
      }
    };

    testAsync(tasks, err => {
      expect(err[0].message).contains("test oops");
      done();
    });
  });
});

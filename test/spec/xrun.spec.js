"use strict";

const gxrun = require("../..");
const XRun = require("../../lib/xrun");
const expect = require("chai").expect;
const xstdout = require("xstdout");
const chalk = require("chalk");
const assert = require("assert");
const stripAnsi = require("strip-ansi");
const Munchy = require("munchy");
const { PassThrough } = require("stream");
const {
  asyncVerify,
  runFinally,
  runTimeout,
  expectError,
  expectErrorToBe,
  runDefer
} = require("run-verify");
const xsh = require("xsh");
const xaa = require("xaa");

describe("xrun", function() {
  this.timeout(10000);

  it("should lookup and exe a task as a function once", () => {
    let foo = 0;
    const xrun = new XRun({
      foo: () => foo++
    });
    const exeEvents = ["lookup", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      expect(data.qItem.name).to.equal("foo");
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(1);
        expect(foo).to.equal(1);
      }
    );
  });

  it("should lookup and call task function with 2 params with context and callback", () => {
    let context;
    const xrun = new XRun({
      foo(ctx, done) {
        context = ctx;
        done();
      }
    });

    return asyncVerify(
      runTimeout(500),
      () => xrun.asyncRun("foo -a=50 --bar=60"),
      () => {
        expect(context).to.be.an("object");
        expect(context.argOpts).to.deep.equal({ a: "50", bar: "60" });
      }
    );
  });

  it("should fail on unknown options if allowUnknownOptions is false", () => {
    let context;
    const xrun = new XRun({
      foo: {
        allowUnknownOptions: false,
        task(ctx) {
          context = ctx;
        }
      }
    });

    return asyncVerify(
      runTimeout(500),
      expectError(() => xrun.asyncRun("foo -a=50 --bar=60")),
      error => {
        expect(error.message).equal("Unknown options for task foo: a, bar");
        expect(context).to.be.undefined;
      }
    );
  });

  it("should pass context to function that take a single param named ctx/context", () => {
    let receivedContext;
    let receivedCtx;
    const xrun = new XRun({
      foo: {
        task(context) {
          receivedContext = context;
        }
      },
      blah: {
        task(ctx) {
          receivedCtx = ctx;
        }
      }
    });

    return asyncVerify(
      next => xrun.run("foo -a=50 --bar=60 ", next),
      () => {
        expect(receivedContext).to.be.an("object");
        expect(receivedContext.argOpts.a).equal("50");
        expect(receivedContext.argOpts.bar).equal("60");
      },
      next => xrun.run("blah -x=500 --abc=100", next),
      () => {
        expect(receivedCtx).to.be.an("object");
        expect(receivedCtx.argOpts.x).equal("500");
        expect(receivedCtx.argOpts.abc).equal("100");
      }
    );
  });

  it("should exe task name return by function", done => {
    let foo = 0;
    const xrun = new XRun({
      foo: () => "foo2",
      foo2: () => foo++
    });
    const exeEvents = ["lookup", "function", "lookup", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    xrun.run("foo", err => {
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
    const xrun = new XRun({
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

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    xrun.run("foo", err => {
      if (err) {
        return done(err);
      }
      expect(doneItem).to.equal(4);
      expect(foo2).to.equal(1);
      expect(foo3).to.equal(1);
      done(err);
    });
  });

  it("should exe function return by function", () => {
    let foo = 0;
    const xrun = new XRun({
      foo: () => () => foo++
    });
    const exeEvents = ["lookup", "function", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(2);
        expect(foo).to.equal(1);
      }
    );
  });

  it("should pass task options as argv", () => {
    const xrun = new XRun({
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

    return asyncVerify(next => xrun.run(["foo", "foo1 --test", "foo2 --a --b"], next));
  });

  it("should execute a dep string as shell directly", () => {
    let foo = 0;
    const xrun = new XRun({
      foo: {
        dep: "set a=0",
        task: () => foo++
      }
    });
    const exeEvents = ["lookup", "shell", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(2);
        expect(foo).to.equal(1);
      }
    );
  });

  it("should handle error from dep shell", () => {
    let foo = 0;
    const xrun = new XRun({
      foo: {
        dep: "exit 1",
        task: () => foo++
      }
    });
    const exeEvents = ["lookup", "shell", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).to.equal("shell cmd 'exit 1' exit code 1");
        expect(doneItem).to.equal(1);
        expect(foo).to.equal(0);
      }
    );
  });

  it("should execute shell with tty", () => {
    const xrun = new XRun({
      foo: `~(tty)$node -e "process.exit(process.stdout.isTTY ? 0 : 1)"`
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(1);
      }
    );
  });

  const execXTaskSpec = flags => {
    const xrun = new XRun({
      foo: gxrun.exec(`node -e "process.exit(process.stdout.isTTY ? 0 : 1)"`, { flags })
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(1);
      }
    );
  };

  it("should execute XTaskSpec shell with string tty flag", () => {
    return execXTaskSpec("tty");
  });

  it("should execute XTaskSpec shell with array tty flag", () => {
    return execXTaskSpec(["tty"]);
  });

  it("should execute XTaskSpec shell with object tty flag", () => {
    return execXTaskSpec({ tty: true });
  });

  it("should execute XTaskSpec shell with npm flag", () => {
    return execXTaskSpec({ npm: true });
  });

  it("should execute anonymous XTaskSpec shell task", () => {
    const xrun = new XRun({
      foo: [gxrun.exec(`node -e "process.exit(process.stdout.isTTY ? 0 : 1)"`, "tty")]
    });
    const exeEvents = ["lookup", "serial-arr", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(2);
      }
    );
  });

  it("should execute shell with spawn sync", () => {
    const xrun = new XRun({
      foo: `~(spawn,sync)$echo hello`
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(1);
      }
    );
  });

  it("should execute shell with spawn sync noenv", () => {
    process.env.FOO_NOENV = 1;
    const xrun = new XRun({
      foo: `~(spawn,sync,noenv)$exit $FOO_NOENV`
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(1);
      }
    );
  });

  it("env should avoid replacing if override is false", () => {
    const key = `TEST_${Date.now()}`;
    delete process.env[key];
    process.env[key] = "TEST123";
    const xrun = new XRun({});

    xrun.load({
      foo: xrun.env({ [key]: "blah" }, { override: false })
    });

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(process.env[key]).to.equal("TEST123");
        delete process.env[key];
      }
    );
  });

  it("updateEnv should set env", () => {
    const key = `TEST_${Date.now()}`;
    delete process.env[key];
    const xrun = new XRun({});
    xrun.updateEnv({ [key]: "hello" });
    expect(process.env[key]).to.equal("hello");
    delete process.env[key];
  });

  it("should handle shell with unknown flag", () => {
    const xrun = new XRun({
      foo: `~(spawn,foo,sync)$echo hello`
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(doneItem).to.equal(0);
        expect(err.message).contains("Unknown flag foo in shell task");
      }
    );
  });

  it("should handle XTaskSpec with unknown type", () => {
    const xrun = new XRun({
      foo: new gxrun.XTaskSpec({ type: "blah" })
    });

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).include("Unable to process XTaskSpec type blah");
      }
    );
  });

  it("should handle anonymous XTaskSpec with unknown type", () => {
    const xrun = new XRun({
      foo: [new gxrun.XTaskSpec({ type: "blah" })]
    });

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).include("Unable to process XTaskSpec type blah");
      }
    );
  });

  it("should handle fail status of shell with spawn", () => {
    const xrun = new XRun({ foo: `~(spawn)$node -e "process.exit(1)"` });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).to.equal(`cmd "node -e "process.exit(1)"" exit code 1`);
        expect(doneItem).to.equal(1);
      }
    );
  });

  it("should handle fail status of shell with spawn sync", () => {
    const xrun = new XRun({ foo: `~(spawn,sync)$node -e "process.exit(1)"` });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).to.equal(`cmd "node -e "process.exit(1)"" exit code 1`);
        expect(doneItem).to.equal(1);
      }
    );
  });

  it("should handle error of shell with spawn sync", () => {
    const xrun = new XRun({
      foo: {
        options: { timeout: 10 },
        task: `~(spawn,sync)$sleep 1`
      }
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).contains(`ETIMEDOUT`);
        expect(doneItem).to.equal(1);
      }
    );
  });

  it("should kill task exec child and stop", () => {
    const xrun = new XRun();
    xrun.load({
      ".stop": () => xrun.stop(),
      "test-stop": xrun.concurrent(
        xrun.serial("~$echo abc", "~$sleep 1", "~$echo BAD IF YOU SEE THIS"),
        xrun.serial(() => xaa.delay(100), ".stop", "~$echo BAD IF YOU SEE THIS ALSO")
      )
    });

    const intercept = xstdout.intercept(true);

    return asyncVerify(
      next => {
        xrun.run("test-stop", next);
      },
      () => {
        intercept.restore();
        expect(intercept.stdout.join()).not.include("BAD IF YOU SEE THIS");
      },
      runFinally(() => {
        intercept.restore();
      })
    );
  });

  it("should kill task spawn child and stop", () => {
    const xrun = new XRun();
    xrun.load({
      "test-stop": xrun.concurrent(
        xrun.serial("~$echo abc", "~(spawn)$sleep 2", "~$echo BAD IF YOU SEE THIS"),
        xrun.serial(() => xaa.delay(100), xrun.stop(), "~$echo BAD IF YOU SEE THIS ALSO")
      )
    });

    const intercept = xstdout.intercept(true);

    return asyncVerify(
      next => {
        xrun.run("test-stop", next);
      },
      () => {
        intercept.restore();
        expect(intercept.stdout.join()).not.include("BAD IF YOU SEE THIS");
      },
      runFinally(() => {
        intercept.restore();
      })
    );
  });

  it("should kill task child from a function and stop", () => {
    const xrun = new XRun();
    xrun.load({
      ".stop": () => xrun.stop(),
      "test-stop": xrun.concurrent(
        xrun.serial("~$echo abc", () => xsh.exec("sleep 2"), "~$echo BAD IF YOU SEE THIS"),
        xrun.serial(() => xaa.delay(100), ".stop", "~$echo BAD IF YOU SEE THIS ALSO")
      )
    });

    const intercept = xstdout.intercept(true);

    return asyncVerify(
      next => {
        xrun.run("test-stop", next);
      },
      () => {
        intercept.restore();
        expect(intercept.stdout.join()).not.include("BAD IF YOU SEE THIS");
      },
      runFinally(() => {
        intercept.restore();
      })
    );
  });

  it("should handle error of shell command malformed", () => {
    const xrun = new XRun({
      foo: {
        options: { timeout: 10 },
        task: `~(spawn,syncsleep 1`
      }
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).contains(`Missing )$ in shell task: ~(spawn,syncsleep 1`);
        expect(doneItem).to.equal(0);
      }
    );
  });

  it("should handle error from task shell", () => {
    const xrun = new XRun({
      foo: {
        task: "exit 1"
      }
    });
    const exeEvents = ["lookup", "shell"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", _data => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).to.equal("shell cmd 'exit 1' exit code 1");
        expect(doneItem).to.equal(1);
      }
    );
  });

  it("should execute serial tasks", () => {
    let foo = 0;
    const xrun = new XRun({
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

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(6);
        expect(foo).to.equal(1);
      }
    );
  });

  it("should count tasks", () => {
    const xrun = new XRun();
    expect(xrun.countTasks()).to.equal(0);
    xrun.load({ foo: () => undefined });
    expect(xrun.countTasks()).to.equal(1);
    xrun.load("1", { foo: () => undefined, bar: () => undefined });
    expect(xrun.countTasks()).to.equal(3);
  });

  it("should handle top serial tasks with first dot", () => {
    let foo = 0;
    const xrun = new XRun({
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

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(6);
        expect(foo).to.equal(1);
      }
    );
  });

  it("should execute concurrent tasks", () => {
    let foo = 0,
      foo2 = 0;
    const xrun = new XRun({
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

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(7);
        expect(foo).to.equal(1);
        expect(foo2).to.equal(1);
      }
    );
  });

  it("should run a user array concurrently", () => {
    let foo = 0,
      foo2 = 0,
      fooX = 0;
    const xrun = new XRun({
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

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      next => xrun.run(["foo", "fooX"], next),
      () => {
        expect(doneItem).to.equal(9);
        expect(foo).to.equal(1);
        expect(foo2).to.equal(1);
        expect(fooX).to.equal(1);
      }
    );
  });

  it("should return all errors from concurrent tasks", () => {
    let foo = 0,
      foo2 = 0;
    const xrun = new XRun({
      foo: [() => foo++, ["a", "b", () => foo2++, "c"]],
      a: _cb => {
        throw new Error("a failed");
      },
      b: cb => setTimeout(() => process.nextTick(cb), 20),
      c: _cb => {
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

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.more).to.exist;
        expect(err.more.length).to.equal(1);
        expect(err.message).to.equal("a failed");
        expect(err.more[0].message).to.equal("c failed");
        expect(doneItem).to.equal(7);
        expect(foo).to.equal(1);
        expect(foo2).to.equal(1);
      },
      next => xrun.waitAllPending(next),
      () => {
        expect(doneItem).to.equal(7);
      }
    );
  });

  it("should execute a dep function directly", () => {
    let foo = 0,
      dep = 0;
    const xrun = new XRun({
      foo: {
        dep: () => dep++,
        task: () => foo++
      }
    });
    const exeEvents = ["lookup", "function", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let doneItem = 0;
    xrun.on("done-item", () => doneItem++);

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(doneItem).to.equal(2);
        expect(dep).to.equal(1);
        expect(foo).to.equal(1);
      }
    );
  });

  it("should execute a dep as serial array", () => {
    let foo = 0,
      foo2 = 0;
    const xrun = new XRun({
      foo: {
        dep: ["foo2"],
        task: () => foo++
      },
      foo2: () => foo2++
    });
    const exeEvents = ["lookup", "serial-arr", "lookup", "function", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(foo).to.equal(1);
        expect(foo2).to.equal(1);
      }
    );
  });

  it("should parse and execute array in a string", () => {
    let foo2 = 0,
      foo3 = 0;
    const xrun = new XRun({
      foo: {
        dep: "~[foo2]",
        task: "~[fooX, [foo2, fooX]]"
      },
      fooX: "~[fooY]",
      fooY: () => "~[foo2, foo3]",
      foo2: () => foo2++,
      foo3: () => foo3++
    });
    const exeEvents = [
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
    ];
    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(foo2).to.equal(4);
        expect(foo3).to.equal(2);
      }
    );
  });

  it("should execute a dep as serial and then concurrent array", () => {
    let foo = 0,
      foo2 = 0;
    const xrun = new XRun({
      foo: {
        dep: [["foo2"]],
        task: () => foo++
      },
      foo2: () => foo2++
    });
    const exeEvents = ["lookup", "serial-arr", "concurrent-arr", "lookup", "function", "function"];

    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(foo).to.equal(1);
        expect(foo2).to.equal(1);
      }
    );
  });

  it("should await a promise a task function returned", () => {
    let foo2 = 0;
    const xrun = new XRun({
      foo: () => new Promise(resolve => setTimeout(() => resolve("foo2"), 10)),
      foo2: () => foo2++
    });

    const exeEvents = ["lookup", "function", "lookup", "function"];
    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(foo2).to.equal(1);
      }
    );
  });

  it("should supply context as this to task function", () => {
    let foo = 0,
      foo3 = 0;
    const xrun = new XRun();
    xrun.load({
      foo2: {
        dep: "set a=0",
        task: ["foo3"]
      },
      foo3: [
        "~$set b=0",
        function() {
          this.run([".", "foo4", () => foo3++], _err => foo++);
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
    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    return asyncVerify(
      next => xrun.run("foo2", next),
      () => {
        expect(foo).to.equal(1);
        expect(foo3).to.equal(1);
      }
    );
  });

  it("should ignore value returned by task function that's not string/function/array", () => {
    let foo;

    const xrun = new XRun({
      foo: () => (foo = 999)
    });

    // const events = [];

    const exeEvents = ["lookup", "function"];
    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        expect(foo).to.equal(999);
      }
    );
  });

  it("should handle error from event handler", () => {
    const xrun = new XRun({
      foo: () => undefined
    });
    xrun.on("execute", _data => {
      throw new Error("test");
    });
    return asyncVerify(expectError(next => xrun.run("foo", next)));
  });

  it("should support load tasks", () => {
    const xrun = new XRun();
    xrun.load("1", {
      foo: () => {
        throw new Error("test");
      }
    });
    return asyncVerify(expectErrorToBe(next => xrun.run("1/foo", next), "test"));
  });

  it("should handle direct error from exe a function task", () => {
    const xrun = new XRun({
      foo: () => {
        throw new Error("test");
      }
    });
    return asyncVerify(expectErrorToBe(next => xrun.run("foo", next), "test"));
  });

  it("should exit on error", () => {
    const intercept = xstdout.intercept(true);
    let testStatus;
    const ox = process.exit;

    const defer = runDefer(500);

    process.exit = status => {
      testStatus = status;
      defer.resolve();
    };

    const xrun = new XRun({
      foo: () => {
        throw new Error("test");
      }
    });

    return asyncVerify(
      () => xrun.run("foo"),
      runFinally(() => intercept.restore()),
      // wait for xrun to execute foo, catch the error, and then try to exit
      defer.wait(),
      () => {
        // restore process.exit
        process.exit = ox;
        intercept.restore();
        expect(intercept.stdout.join()).include("Execution Failed - Errors:");
        expect(testStatus).to.equal(1);
      }
    );
  });

  it("should not exit on error if stopOnError is false", () => {
    const intercept = xstdout.intercept(true);
    let testStatus = "test";
    const ox = process.exit;

    process.exit = () => {
      testStatus = "called";
    };
    const defer = runDefer(500);
    const xrun = new XRun({
      foo: () => {
        defer.resolve();
        throw new Error("test");
      }
    });
    xrun.stopOnError = false;

    return asyncVerify(
      () => xrun.run("foo"),
      runFinally(() => intercept.restore()),
      defer.wait(),
      () => xaa.delay(10),
      () => {
        process.exit = ox;
        intercept.restore();
        expect(intercept.stdout.join()).include("Execution Failed - Errors:");
        expect(testStatus).to.equal("test");
      }
    );
  });

  it("_exitOnError should do nothing for no error", () => {
    const ox = process.exit;
    let testStatus = "test";
    process.exit = () => {
      testStatus = "called";
    };
    const xrun = new XRun();
    xrun._exitOnError();
    process.exit = ox;
    expect(testStatus).to.equal("test");
  });

  it("should fail for object task with unknown value type", () => {
    const xrun = new XRun({
      foo: ["foo2"],
      foo2: {
        desc: "foo2",
        task: true
      }
    });
    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).to.equal("Task foo2 has unrecognize task value type Boolean");
      }
    );
  });

  it("should fail for task with unknown value type", () => {
    const xrun = new XRun({
      foo: [true]
    });
    return asyncVerify(
      expectError(next => xrun.run("foo", next)),
      err => {
        expect(err.message).to.equal(
          "Unable to process task foo.S because value type Boolean is unknown and no value.item"
        );
      }
    );
  });

  it("should not fail if optional task name is not found", () => {
    const xrun = new XRun({});
    return asyncVerify(next => xrun.run("?foo", next));
  });

  it("should fail if task name is not found", () => {
    const xrun = new XRun({});
    return asyncVerify(expectErrorToBe(next => xrun.run("foo", next), "Task foo not found"));
  });

  it("should show similar tasks if not found", () => {
    const xrun = new XRun({
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

    return asyncVerify(
      runFinally(() => intercept.restore()),
      next => {
        xrun.exit = _code => {
          intercept.restore();
          const stdout = intercept.stdout.map(l => stripAnsi(l));
          expect(stdout[2].trim()).to.equal("Maybe try: foo1, foo2, foo3, moo, xoo");
          next();
        };
        xrun.run("foox");
      }
    );
  });

  it("should fail if namespace is not found", () => {
    const xrun = new XRun({});
    return asyncVerify(
      expectErrorToBe(next => xrun.run("foo/bar", next), "No task namespace foo exist")
    );
  });

  it("should fail if task name is empty", () => {
    const xrun = new XRun({});
    return asyncVerify(
      expectError(next => xrun.run("", next)),
      err => {
        expect(err[0].message).includes(`xqitem must have a name`);
      }
    );
  });

  it("should fail if task is not in namespace", () => {
    const xrun = new XRun("foo", {
      test: () => undefined
    });
    return asyncVerify(
      expectErrorToBe(next => xrun.run("foo/bar", next), "Task bar in namespace foo not found")
    );
  });

  it("should fail if task is not in default namespace", () => {
    const xrun = new XRun({
      test: () => undefined
    });
    return asyncVerify(
      expectErrorToBe(next => xrun.run("/bar", next), "Task bar in namespace / not found")
    );
  });

  describe("stopOnError", function() {
    it("should throw if value is invalid", () => {
      const xrun = new XRun();
      expect(() => (xrun.stopOnError = "blah")).to.throw("stopOnError must be");
    });

    it("should allow to set one of the string values", () => {
      const xrun = new XRun();
      xrun.stopOnError = "full";
      expect(xrun.stopOnError).to.equal("full");
    });
  });

  describe("_exitOnError", function() {
    let intercept;
    const xrun = new XRun();
    xrun.stopOnError = false;
    let saveLevel;
    beforeEach(() => {
      saveLevel = chalk.level;
      chalk.level = 0;
      intercept = xstdout.intercept(true);
    });

    afterEach(() => {
      chalk.level = saveLevel;
      intercept.restore();
    });

    it("should log err if it has no stack", () => {
      xrun._exitOnError("blah test");
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
      xrun._exitOnError([err]);
      intercept.restore();
      expect(intercept.stdout.length).to.equal(2);
    });

    it("should not log stack if it's empty", () => {
      const err = {
        stack: "hello",
        message: "hello"
      };
      xrun._exitOnError([err]);
      intercept.restore();
      expect(intercept.stdout.length).to.equal(2);
    });

    it("should not log stack if it's shell exec failed", () => {
      const err = {
        stack: "hello\n  at ..../xsh/lib/exec.js:9:9",
        message: "hello"
      };
      xrun._exitOnError([err]);
      intercept.restore();
      expect(intercept.stdout.length).to.equal(2);
    });

    it("should handle err as non-array", () => {
      xrun._exitOnError(new Error("test 1"));
      intercept.restore();
      expect(intercept.stdout.length).to.be.above(2);
      expect(intercept.stdout[1]).include("1  test 1");
      expect(intercept.stdout[2]).include(" at ");
    });
  });

  it("getNamespaces should return namespaces in order of overrides", () => {
    const xrun = new XRun("test", {
      foo: () => undefined
    });
    xrun.load("blah", {});
    xrun.load({ namespace: "foo", overrides: "blah" }, {});
    xrun.load({ namespace: "blah", overrides: "hello" }, {});
    xrun.load("hello", {});
    expect(xrun.getNamespaces()).to.deep.equal(["/", "foo", "blah", "test", "hello"]);
  });

  it("should cancel and kill a shell exec on error", () => {
    const defer = runDefer(500);
    const tasks = {
      sh: "sleep 1; echo sh output",
      fnErr: () => {
        defer.resolve();
        throw new Error("error");
      }
    };

    const xrun = new XRun(tasks);
    const intercept = xstdout.intercept(true);
    return asyncVerify(
      runFinally(() => intercept.restore()),
      expectError(next => xrun.run(["sh", "fnErr"], next)),
      defer.wait(500),
      () => xaa.delay(100),
      () => {
        intercept.restore();
        expect(intercept.stdout).to.deep.equal([]);
      }
    );
  });

  const timeoutFoo = x => {
    return new Promise(resolve => {
      setTimeout(resolve, x);
    });
  };

  const testAsync = tasks => {
    const xrun = new XRun(tasks);

    const exeEvents = ["lookup", "function", "lookup", "function"];
    xrun.on("execute", data => {
      expect(data.type).to.equal(exeEvents[0]);
      exeEvents.shift();
    });

    let cfoo2 = -1;
    setTimeout(() => (cfoo2 = tasks.foo2Value), 10);

    const start = Date.now();
    return asyncVerify(
      next => xrun.run("foo", next),
      () => {
        const end = Date.now();
        expect(end - start).to.be.above(29);
        expect(cfoo2).to.equal(0);
        expect(tasks.foo2Value).to.equal(1);
      }
    );
  };

  it("should handle async function", () => {
    const tasks = {
      foo2Value: 0,
      foo: async () => {
        await timeoutFoo(30);
        return "foo2";
      },
      foo2: () => tasks.foo2Value++
    };
    return testAsync(tasks);
  });

  it("should handle async task function", () => {
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
    return testAsync(tasks);
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

  it("should handle function returning stream", () => {
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

    return testAsync(tasks);
  });

  it("should handle function returning stream that fail", () => {
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

    return asyncVerify(
      expectError(() => testAsync(tasks)),
      err => {
        expect(err.message).contains("test oops");
      }
    );
  });
});

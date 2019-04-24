"use strict";

// testing the finally hook

const XClap = require("../../lib/xclap");
const expect = require("chai").expect;
const xstdout = require("xstdout");
const chalk = require("chalk");
const assert = require("assert");

describe("xclap finally", function() {
  let logs = [];
  const tasks = {
    fnFail: () => {
      throw new Error("fnFail throwing");
    },
    fnFoo2: "echo hello from foo2",
    fnFoo: {
      task: () => {
        logs.push("fnFoo");
        return new Promise(resolve => setTimeout(resolve, 400)).then(() => {
          logs.push("fnFoo async");
          return "fnFoo2";
        });
      },
      finally: ["fooCleanup"]
    },
    fooCleanup: function() {
      logs.push(`woop finally ${this.err} ${this.failed}`);
    },
    fnFooX: {
      task: () => {
        logs.push("fnFooX");
        return new Promise(resolve => setTimeout(resolve, 0)).then(() => {
          logs.push("fnFooX async");
          throw new Error("fnFooX error");
        });
      },
      finally: function() {
        logs.push(`woopX finally ${this.err} ${this.failed}`);
      }
    },
    shFoo: {
      task: "~$echo sleep 1 && sleep 1",
      finally: "~$echo sh finally"
    },
    shFooX: {
      task: "~$blah",
      finally: "~$echo err $XCLAP_ERR fail $XCLAP_FAILED"
    },
    fnSh: {
      task: () => {
        throw new Error();
      },
      finally: "~$echo fhSh err $XCLAP_ERR fail $XCLAP_FAILED"
    },
    fooConcurrent: [["fnFoo", "fnFail", "fnFooX"]],
    shConcurrent: [["shFoo", "fnFoo"]]
  };

  beforeEach(() => {
    logs = [];
  });

  it("should invoke simple function hook", done => {
    const xclap = new XClap(tasks);
    xclap.stopOnError = "soft";
    xclap.on("execute", data => {
      const fin = data.qItem.isFinally ? " X" : "";
      logs.push(`${data.type}${fin}`);
    });
    xclap.run("fooConcurrent", err => {
      expect(err.message).to.equal("fnFail throwing");
      expect(logs.sort()).to.deep.equal(
        [
          "lookup",
          "serial-arr",
          "concurrent-arr",
          "lookup",
          "lookup",
          "lookup",
          "function",
          "fnFoo",
          "function",
          "function",
          "fnFooX",
          "fnFoo async",
          "fnFooX async",
          "function X",
          "woopX finally Error: fnFooX error Error: fnFail throwing",
          "serial-arr X",
          "lookup X",
          "function X",
          "woop finally undefined Error: fnFail throwing"
        ].sort()
      );
      done();
    });
  });

  it("should invoke simple shell hook", done => {
    const xclap = new XClap(tasks);
    xclap.stopOnError = "soft";
    xclap.on("execute", data => {
      const fin = data.qItem.isFinally ? " X" : "";
      logs.push(`${data.type}${fin}`);
    });
    const intercept = xstdout.intercept(true);
    xclap.run("shConcurrent", () => {
      intercept.restore();
      expect(intercept.stdout.map(x => x.trim())).to.deep.equal([
        "sleep 1",
        "hello from foo2",
        "sh finally"
      ]);
      expect(logs).to.deep.equal([
        "lookup",
        "serial-arr",
        "concurrent-arr",
        "lookup",
        "lookup",
        "function",
        "fnFoo",
        "shell",
        "fnFoo async",
        "lookup",
        "shell",
        "serial-arr X",
        "lookup X",
        "function X",
        "woop finally undefined null",
        "shell X"
      ]);
      done();
    });
  });

  it("should invoke simple shell hook", done => {
    const xclap = new XClap(tasks);
    xclap.stopOnError = "soft";
    xclap.on("execute", data => {
      const fin = data.qItem.isFinally ? " X" : "";
      logs.push(`${data.type}${fin}`);
    });
    const intercept = xstdout.intercept(true);
    xclap.run(["shFooX", "fnSh"], () => {
      intercept.restore();
      expect(logs).to.deep.equal([
        "concurrent-arr",
        "lookup",
        "lookup",
        "function",
        "shell",
        "shell X",
        "shell X"
      ]);
      expect(intercept.stdout.map(x => x.trim())).to.deep.equal([
        "fhSh err true fail true",
        "err shell cmd 'blah' exit code 127 fail true"
      ]);
      done();
    });
  });
});

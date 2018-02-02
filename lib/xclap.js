"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const chalk = require("chalk");
const XQtor = require("./xqtor");
const XTasks = require("./xtasks");
const XQItem = require("./xqitem");
const XQTree = require("./xqtree");
const logger = require("./logger");
const EventEmitter = require("events");
const printTasks = require("./print-tasks");

// full - full stop, interrupting all pending async tasks
// soft - allow pending async tasks to complete, but no more new tasks
// "" - march on
const STOP_ON_ERROR = ["", "soft", "full"];

class XClap extends EventEmitter {
  constructor(namespace, tasks) {
    super();
    this._tasks = new XTasks(namespace, tasks);
    this.failed = null;
    this.stopOnError = true;
    this.xqTree = new XQTree();
    this._logger = logger;
    this._pending = 0;
    this.on("spawn-async", () => this._pending++);
    this.on("done-async", () => this._pending--);
  }

  get stopOnError() {
    return this._stopOnError;
  }

  set stopOnError(v) {
    if (v === false) {
      this._stopOnError = "";
    } else if (v === true) {
      this._stopOnError = "full";
    } else {
      assert(
        STOP_ON_ERROR.indexOf(v) >= 0,
        `stopOnError must be true or false, or one of ${STOP_ON_ERROR.map(JSON.stringify).join(
          ", "
        )}`
      );
      this._stopOnError = v;
    }

    return this;
  }

  load(namespace, tasks) {
    this._tasks.load(namespace, tasks);
    return this;
  }

  run(name, done) {
    if (this._tasks.hasFinally() && this.stopOnError === "full") {
      this.emit("warn-finally");
    }
    done = done || this._exitOnError.bind(this);
    const xqtor = new XQtor({ tasks: this._tasks, done, clap: this });

    try {
      if (typeof name === "string") {
        this.emit("run", { name });
        xqtor.pushItem(this.xqTree.create({ name }));
      } else {
        this.emit("run", { tasks: name });
        xqtor.pushItem(this.xqTree.create({ name: "run", value: name }));
      }
      xqtor.next();
    } catch (err) {
      done([err]);
    }
    return this;
  }

  printTasks() {
    printTasks(this._tasks);
    return this;
  }

  countTasks() {
    return this._tasks.count();
  }

  getNamespaces() {
    return this._tasks._namespaces;
  }

  fail(err) {
    if (!this.failed) {
      this.failed = [err];
    } else {
      this.failed.push(err);
    }
    return this;
  }

  waitAllPending(done) {
    const wait = () => {
      if (this._pending === 0) {
        return done();
      }
      setTimeout(wait, 10);
    };
    process.nextTick(wait);
    return this;
  }

  _exitOnError(err) {
    if (err) {
      console.log(chalk.bold.red.inverse(" Execution Failed - Errors: "));
      if (!Array.isArray(err)) err = [err];
      err.forEach((e, x) => {
        const idx = chalk.bold.red.inverse(` ${x + 1} `);
        if (!e.stack) {
          console.log(idx, e);
          return;
        }
        const lines = e.stack.split("\n");
        console.log(idx, e.message);
        if (e.name && e.name.indexOf("AssertionError") >= 0) return;
        if (lines.length < 2) return;
        if (lines[1].indexOf("xsh/lib/exec.js") >= 0) return;
        for (let i = 1; i < lines.length; i++) {
          console.log(chalk.gray(lines[i]));
        }
      });
      if (this.stopOnError) {
        process.exit(1);
      }
    }
  }
}

module.exports = XClap;

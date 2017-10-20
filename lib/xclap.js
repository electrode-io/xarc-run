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

  load(namespace, tasks) {
    this._tasks.load(namespace, tasks);
  }

  run(name, done) {
    done = done || this._exitOnError.bind(this);
    const xqtor = new XQtor({ tasks: this._tasks, done, clap: this });

    try {
      if (typeof name === "string") {
        this.emit("run", { name });
        xqtor.queue.push(this.xqTree.create({ name }));
      } else {
        this.emit("run", { tasks: name });
        xqtor.queue.push(this.xqTree.create({ name: "run", value: name }));
      }
      xqtor.next();
    } catch (err) {
      done([err]);
    }
  }

  printTasks() {
    printTasks(this._tasks);
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
  }

  waitAllPending(done) {
    const wait = () => {
      if (this._pending === 0) {
        return done();
      }
      setTimeout(wait, 10);
    };
    process.nextTick(wait);
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

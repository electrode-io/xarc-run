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
    xqtor.queue.push(this.xqTree.create({ name }));
    xqtor.next();
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
    setTimeout(wait, 10);
  }

  _exitOnError(err) {
    if (err) {
      console.log("execution failed, errors:", err);
      if (this.stopOnError) {
        process.exit(1);
      }
    }
  }
}

module.exports = XClap;

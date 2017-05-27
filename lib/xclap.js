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
    this.failed = false;
    this.stopOnError = true;
    this.xqTree = new XQTree();
    this._logger = logger;
  }

  load(namespace, tasks) {
    this._tasks.load(namespace, tasks);
  }

  run(name) {
    const done = err => {
      if (err) {
        console.log("execution failed, errors:", err);
        process.exit(1);
      }
    };

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
}

module.exports = XClap;

"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const Insync = require("insync");
const chalk = require("chalk");
const logger = require("./logger");
const genXqId = require("./gen-xqid");

class XQtor {
  constructor(options) {
    this._tasks = options.tasks;
    this._done = options.done;
    this._clap = options.clap;
    this.queue = [];
    this._pending = {};
  }

  next(err, xqId) {
    const next = () => {
      if (err) {
        const xqItem = this._pending[xqId];
        if (xqItem) {
          xqItem.err = err;
        }
        this._clap.fail(err);
      }

      if (this.queue.length > 0) {
        this.execute();
      } else {
        this._done(this._clap.failed);
      }
    };

    setTimeout(next, 0);
  }

  execute() {
    assert(this.queue.length > 0, "no next task");

    const qItem = this.queue[0];
    let xqId = qItem.xqId;
    this.queue = this.queue.slice(1);
    if (qItem.mark) {
      return this._processDone(qItem);
    }

    if (this._clap.failed && this._clap.stopOnError) {
      return this.next(null, qItem.xqId);
    }

    const value = qItem.value;
    const vtype = value.constructor.name;
    if (vtype === "String") {
      if (value.startsWith(defaults.ANON_SHELL_SIG)) {
        console.log(
          ">>>>> executing anoymous shell command",
          value.substr(defaults.ANON_SHELL_SIG.length)
        );
      } else {
        logger.log(`Execute task ${chalk.cyan(value)}`);
        const mark = this._insertDone(qItem, `executing task ${chalk.cyan(value)}`);
        this.queue.unshift({
          parents: qItem.parents.concat(value),
          value: this._tasks.lookup(value),
          xqId: mark.xqId
        });
      }
    } else if (vtype === "Function") {
      let cb;
      if (qItem.anon) {
        logger.log("Executing anonymous function");
        cb = err => {
          logger.log("Done executing anonymous function");
          this.next(err, qItem.xqId);
        };
      }
      return this._functionXer(qItem, value, cb);
    } else if (vtype === "Array") {
      if (value[0] === defaults.SERIAL_SIG) {
        this._processSerialArray(value.slice(1), qItem.parents);
      } else {
        return this._processConcurrentArray(value, qItem.parents);
      }
    } else if (value.item) {
      if (value.item.dep && !qItem.xqDep) {
        this.queue.unshift(Object.assign({ xqDep: true }, qItem));
        const mark = this._insertDone(qItem, `executing task ${chalk.cyan(value.name)} dependencies`);
        this.queue.unshift({
          parents: qItem.parents,
          value: { name: "", top: true, item: value.item.dep },
          xqId: mark.xqId
        });
      } else {
        return this._processTaskObject(qItem);
      }
    }

    return this.next(null, qItem.xqId);
  }

  _processTaskObject(qItem) {
    const value = qItem.value;
    const itemTask = value.item.task || value.item;
    const type = itemTask.constructor.name;
    if (type === "Array") {
      const ss = itemTask[0] === defaults.SERIAL_SIG;
      if (value.top || ss) {
        this._processSerialArray(
          ss ? itemTask.slice(1) : itemTask,
          qItem.parents
        );
      } else {
        return this._processConcurrentArray(itemTask, qItem.parents);
      }
    } else if (type === "Function") {
      return this._functionXer(qItem, itemTask);
    } else if (type === "String") {
      console.log(">>>> executing shell command of task", value.name);
    }

    return this.next(null, qItem.xqId);
  }

  _processSerialArray(tasks, parents) {
    logger.log("Processing serial array");
    this.queue = tasks
      .map(value => {
        return {
          parents: parents.slice(0),
          value,
          anon: typeof value === "function"
        };
      })
      .concat([this._makeXqDoneItem({}, "serial job")])
      .concat(this.queue);
  }

  _processConcurrentArray(tasks, parents) {
    logger.log("Processing concurrent array");
    const errors = [];
    Insync.parallel(
      tasks.map(value => cb => {
        const xqtor = new XQtor({
          tasks: this._tasks,
          done: (err) => {
            if (err) {
              errors.push(err);
            }
            process.nextTick(() => cb(err, value));
          },
          clap: this._clap
        });
        xqtor.queue.push({
          parents: parents.slice(0),
          value,
          anon: typeof value === "function"
        });
        xqtor.next();
      }),
      () => {
        if (errors.length > 0) {
          logger.log(chalk.red(`Failure occurred in conncurrent job`));
        } else {
          logger.log(`Done concurrent job`);
        }
        this.next();
      }
    );
  }

  _functionXer(qItem, fn, cb) {
    if (!cb) {
      cb = err => this.next(err, qItem && qItem.xqId);
    }
    try {
      if (fn.length === 0) {
        const x = fn();
        if (x && x.then) {
          x.then(() => cb(), cb);
        } else {
          cb();
        }
      } else {
        fn(cb);
      }
    } catch (err) {
      cb(err);
    }
  }

  _processDone(qItem) {
    const xqItem = this._pending[qItem.xqId];
    const elapse = (Date.now() - qItem.startTime) / 1000;
    const failed = !!this._clap.failed;
    const status = xqItem.err ? "Failed " : "Done ";
    logger.log((failed ? chalk.red(status) : status) + qItem.msg + chalk.magenta(` (${elapse.toFixed(2)} ms)`));
    delete this._pending[qItem.xqId];
    this.next();
  }

  _makeXqDoneItem(qItem, msg) {
    const xqId = genXqId();
    const p = {
      mark: true,
      startTime: Date.now(),
      qItem,
      msg,
      xqId
    };
    this._pending[xqId] = p;
    return p;
  }

  _insertDone(qItem, msg) {
    const x = this._makeXqDoneItem(qItem, msg);
    this.queue.unshift(x);
    return x;
  }
}

module.exports = XQtor;

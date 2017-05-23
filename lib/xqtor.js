"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const Insync = require("insync");
const chalk = require("chalk");
const logger = require("./logger");
const genXqId = require("./gen-xqid");
const XQItem = require("./xqitem");
const exec = require("./exec");

class XQtor {
  constructor(options) {
    this._tasks = options.tasks;
    this._done = options.done;
    this._clap = options.clap;
    this.queue = [];
  }

  next(err, xqId) {
    const next = () => {
      if (err) {
        const qItem = this._clap.xqTree.item(xqId);
        if (qItem) {
          qItem.err = err;
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
    this.queue = this.queue.slice(1);
    if (qItem.mark) {
      return this._processDone(qItem);
    }

    const xqId = qItem.id;

    if (this._clap.failed && this._clap.stopOnError) {
      return this.next(null, xqId);
    }

    const value = qItem.value();
    const vtype = value.constructor.name;
    if (vtype === "String") {
      if (value.startsWith(defaults.ANON_SHELL_SIG)) {
        const cmd = value.substr(defaults.ANON_SHELL_SIG.length);
        logger.log(qItem.indent() + `Executing ${chalk.cyan(cmd)}`);
        this._insertDone(qItem, `shell ${chalk.cyan(cmd)}`);
        return exec(cmd, false, (err, output) => this.next(err));
      } else {
        this._insertDone(qItem, `executing task ${chalk.cyan(value)}`);
        qItem.lookup(this._tasks);
        this.queue.unshift(qItem);
      }
    } else if (vtype === "Function") {
      return this._functionXer(qItem, value);
    } else if (vtype === "Array") {
      return this._processArray(qItem, value);
    } else if (value.item) {
      if (value.item.dep && !qItem.xqDep) {
        logger.log(
          qItem.indent() +
            `Processing task ${chalk.cyan(qItem.name)} dependencies`
        );
        qItem.xqDep = true;
        this.queue.unshift(qItem);
        this._insertDone(
          qItem,
          `processing task ${chalk.cyan(qItem.name)} dependencies`
        );
        this.queue.unshift(
          this._clap.xqTree.create(
            {
              name: `${qItem.name}-dep`,
              value: { top: true, item: value.item.dep }
            },
            qItem
          )
        );
      } else {
        return this._processTaskObject(qItem);
      }
    }

    return this.next(null, xqId);
  }

  _processTaskObject(qItem) {
    const value = qItem.value();
    const itemTask = value.item.task || value.item;
    const type = itemTask.constructor.name;
    if (type === "Array") {
      return this._processArray(qItem, itemTask, value.top);
    } else if (type === "Function") {
      return this._functionXer(qItem, itemTask);
    } else if (type === "String") {
      logger.log(
        qItem.indent() +
          `Executing task ${chalk.cyan(qItem.name)} ${chalk.blue(itemTask)}`
      );
      return exec(itemTask, false, (err, output) => {
        this.next(err);
      });
    }

    this.next(null, qItem.id);
  }

  _parentName(qItem) {
    const parent = this._clap.xqTree.parent(qItem);
    return parent && parent.name;
  }

  _processArray(qItem, tasks, top) {
    const ss = tasks[0] === defaults.SERIAL_SIG;
    if (top || ss) {
      this._processSerialArray(qItem, tasks, ss);
    } else {
      this._processConcurrentArray(qItem, tasks);
    }
  }

  _stringifyArray(tasks) {
    try {
      return JSON.stringify(tasks, (key, value) => {
        if (typeof value === "function") {
          return "func";
        }
        return value;
      });
    } catch (err) {
      return err.message;
    }
  }

  _processSerialArray(qItem, tasks, slice) {
    const taskName = qItem.name || this._parentName(qItem);
    const ts = chalk.blue(this._stringifyArray(tasks));
    logger.log(
      qItem.indent() +
        `Processing task ${chalk.cyan(taskName)} serial array ${ts}`
    );
    if (slice) {
      tasks = tasks.slice(1);
      this._insertDone(qItem, `${chalk.cyan(taskName)} serial array`);
    }
    this.queue = tasks
      .map(value => {
        const name = typeof value !== "string" && `${taskName}:S`;
        return this._clap.xqTree.create(
          {
            name,
            type: "serial_child",
            value,
            anon: typeof value === "function"
          },
          qItem
        );
      })
      .concat(this.queue);
    this.next(null, qItem.id);
  }

  _processConcurrentArray(qItem, tasks) {
    const taskName = qItem.name || this._parentName(qItem);
    const ts = chalk.blue(this._stringifyArray(tasks));
    logger.log(
      qItem.indent() +
        chalk.magenta(
          `Processing task ${chalk.cyan(taskName)} concurrent array ${ts}`
        )
    );
    this._insertDone(qItem, `task ${chalk.cyan(taskName)} concurrent array`);
    Insync.parallel(
      tasks.map(value => cb => {
        const xqtor = new XQtor({
          tasks: this._tasks,
          done: err => {
            process.nextTick(() => cb(err, value));
          },
          clap: this._clap
        });
        const name = typeof value !== "string" && `${qItem.name}:C`;
        xqtor.queue.push(
          this._clap.xqTree.create(
            {
              name,
              type: "concurrent_child",
              value,
              anon: typeof value === "function"
            },
            qItem
          )
        );
        xqtor.next();
      }),
      () => this.next()
    );
  }

  _functionXer(qItem, fn, cb) {
    let name;
    if (!qItem.name) {
      name = `task ${chalk.cyan(this._parentName(qItem))}'s`;
    } else {
      name = `task ${chalk.cyan(qItem.name)}`;
    }
    const anon = qItem.anon ? " anonymous " : " as ";
    logger.log(qItem.indent() + `Executing ${name}${anon}function`);
    if (!cb) {
      cb = err => this.next(err, qItem && qItem.id);
    }
    try {
      if (qItem.anon) {
        this._insertDone(qItem, `executing ${name}${anon}function`);
      }
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
    const value = qItem.value();
    const xqItem = this._clap.xqTree.item(value.xqId);
    const elapse = (Date.now() - value.startTime) / 1000;
    const msec = `(${elapse.toFixed(2)} ms)`;
    const failed = !!this._clap.failed || !!xqItem.err;
    const result = xqItem.err ? "Failed" : "Done";
    const status = failed ? chalk.red(result) : chalk.green(result);
    xqItem.pending--;
    assert(xqItem.pending >= 0, "xqItem pending not >= 0");
    logger.log(
      `${xqItem.indent()}${status} ${value.msg} ${chalk.magenta(msec)}`
    );
    this.next();
  }

  _makeXqDoneItem(qItem, msg) {
    // do not add marking item to tree
    const mark = new XQItem({
      name: `mark_${qItem.name}`,
      value: {
        startTime: Date.now(),
        msg,
        xqId: qItem.id
      }
    });
    mark.mark = true;
    qItem.pending++;
    return mark;
  }

  _insertDone(qItem, msg) {
    const x = this._makeXqDoneItem(qItem, msg);
    this.queue.unshift(x);
    return x;
  }
}

module.exports = XQtor;

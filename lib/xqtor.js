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
        logger.log(`Executing ${chalk.cyan(cmd)}`);
        return exec(cmd, false, (err, output) => {
          this.next(err);
        });
      } else {
        const mark = this._insertDone(qItem, `executing task ${chalk.cyan(value)}`);
        qItem.lookup(this._tasks);
        this.queue.unshift(qItem);
      }
    } else if (vtype === "Function") {
      let cb;
      if (qItem.anon) {
        logger.log("Executing anonymous function");
        cb = err => {
          logger.log("Done executing anonymous function");
          this.next(err, xqId);
        };
      }
      return this._functionXer(qItem, value, cb);
    } else if (vtype === "Array") {
      if (value[0] === defaults.SERIAL_SIG) {
        this._processSerialArray(qItem, value.slice(1));
      } else {
        return this._processConcurrentArray(qItem, value);
      }
    } else if (value.item) {
      if (value.item.dep && !qItem.xqDep) {
        qItem.xqDep = true;
        this.queue.unshift(qItem);
        const mark = this._insertDone(qItem, `executing task ${chalk.cyan(qItem.name)} dependencies`);
        this.queue.unshift(this._clap.xqTree.create({
          name: `${qItem.name}-dep`,
          value: { top: true, item: value.item.dep }
        }, qItem));
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
      const ss = itemTask[0] === defaults.SERIAL_SIG;
      if (value.top || ss) {
        this._processSerialArray(
          qItem, ss ? itemTask.slice(1) : itemTask
        );
      } else {
        return this._processConcurrentArray(qItem, itemTask);
      }
    } else if (type === "Function") {
      return this._functionXer(qItem, itemTask);
    } else if (type === "String") {
      logger.log(`Executing task ${chalk.cyan(qItem.name)} ${chalk.blue(itemTask)}`);
      return exec(itemTask, false, (err, output) => {
        this.next(err);
      });
    }

    return this.next(null, qItem.id);
  }

  _parentName(qItem) {
    const parent = this._clap.xqTree.parent(qItem);
    return parent && parent.name;
  }

  _processSerialArray(qItem, tasks) {
    let name;

    if (qItem.name) {
      name = `task ${chalk.cyan(qItem.name)}`;
    } else {
      const parentName = this._parentName(qItem);
      name = `task ${chalk.cyan(parentName)}'s anonymous`;
    }

    logger.log(`Executing ${name} serial array ` + JSON.stringify(tasks));
    this.queue = tasks
      .map(value => {
        const name = typeof value !== "string" && "anonymous";
        return this._clap.xqTree.create({
          name,
          type: "serial_child",
          value,
          anon: typeof value === "function"
        }, qItem);
      })
      .concat([this._makeXqDoneItem(qItem, `${name} serial array`)])
      .concat(this.queue);
  }

  _processConcurrentArray(qItem, tasks) {
    logger.log(chalk.magenta("Processing concurrent array"));
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
        const name = typeof value !== "string" && "anonymous";
        xqtor.queue.push(this._clap.xqTree.create({
          name,
          type: "concurrent_child",
          value,
          anon: typeof value === "function"
        }, qItem));
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
    let name;
    if (qItem.anon) {
      name = `task ${chalk.cyan(this._parentName(qItem))}'s anonymous`;
    } else {
      name = `task ${chalk.cyan(qItem.name)} as`
    }
    logger.log(`Executing ${name} function`);
    if (!cb) {
      cb = err => this.next(err, qItem && qItem.id);
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
    const value = qItem.value();
    const xqItem = this._clap.xqTree.item(value.xqId);
    const elapse = (Date.now() - value.startTime) / 1000;
    const failed = !!this._clap.failed;
    const status = xqItem.err ? "Failed " : "Done ";
    logger.log((failed ? chalk.red(status) : status) + value.msg + chalk.magenta(` (${elapse.toFixed(2)} ms)`));
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

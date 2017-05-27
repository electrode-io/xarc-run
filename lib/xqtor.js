"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const Insync = require("insync");
const chalk = require("chalk");
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

    const qItem = this._dequeue();
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
        this._clap.emit("execute", {
          type: "shell",
          anon: true,
          qItem,
          cmd
        });
        this._insertDone(qItem);
        return exec(cmd, false, (err, output) => this.next(err));
      } else {
        this._clap.emit("execute", {
          type: "lookup",
          qItem
        });
        this._insertDone(qItem);
        qItem.lookup(this._tasks);
        this._enqueue(qItem);
      }
    } else if (vtype === "Function") {
      return this._functionXer(qItem, value);
    } else if (vtype === "Array") {
      return this._processArray(qItem, value);
    } else if (value.item) {
      if (value.item.dep && !qItem.xqDep) {
        this._clap.emit("execute", {
          type: "dep",
          qItem
        });
        qItem.xqDep = true;
        this._enqueue(qItem);
        this._insertDone(qItem);
        this._enqueue(
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
      this._clap.emit("execute", {
        type: "shell",
        anon: false,
        qItem,
        cmd: itemTask
      });
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
    this._clap.emit("execute", {
      type: "serial-arr",
      qItem,
      array: tasks
    });
    if (slice) {
      tasks = tasks.slice(1);
      this._insertDone(qItem);
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
    this._clap.emit("execute", {
      type: "concurrent-arr",
      qItem,
      array: tasks
    });
    this._insertDone(qItem);
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
    this._clap.emit("execute", {
      type: "function",
      anon: qItem.anon,
      qItem
    });
    if (!cb) {
      cb = err => this.next(err, qItem && qItem.id);
    }

    const moreFromFn = x => {
      const qi = this._clap.xqTree.create(
        {
          name: `${qItem.name}:fR`,
          value: Array.isArray(x) ? x : [".", x]
        },
        qItem
      );
      this._enqueue(qi);
    };

    const done = (err, value) => {
      if (value) {
        moreFromFn(value);
      }
      cb(err);
    };

    try {
      if (qItem.anon) {
        this._insertDone(qItem);
      }
      if (fn.length > 0) {
        return fn(done);
      }
      const x = fn();
      if (!x) {
        return done();
      }
      if (x.then) {
        return x.then(v => done(null, v), done);
      }
      return done(null, x);
    } catch (err) {
      return done(err);
    }
  }

  _processDone(qItem) {
    const value = qItem.value();
    const xqItem = this._clap.xqTree.item(value.xqId);
    const elapse = (Date.now() - value.startTime) / 1000;
    xqItem.pending--;
    assert(xqItem.pending >= 0, "xqItem pending not >= 0");
    this._clap.emit("done-item", {
      qItem,
      xqItem,
      elapse
    });
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
    this._enqueue(x);
    return x;
  }

  _enqueue(qItem) {
    this.queue.unshift(qItem);
  }

  _dequeue() {
    const x = this.queue.length > 0 && this.queue[0];
    this.queue = this.queue.slice(1);
    return x;
  }
}

module.exports = XQtor;

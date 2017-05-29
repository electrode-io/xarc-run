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
    process.nextTick(() => this._next(err, xqId), 0);
  }

  _next(err, xqId) {
    if (err) {
      const qItem = this._clap.xqTree.item(xqId);
      qItem.err = err;
      this._clap.fail(err);
    }

    if (this.queue.length > 0) {
      this.execute();
    } else {
      this._done(this._clap.failed);
    }
  }

  execute() {
    assert(this.queue.length > 0, "no next task");

    const qItem = this._dequeue();
    if (qItem.mark) {
      return this._processDone(qItem);
    }

    if (this._clap.failed && this._clap.stopOnError) {
      return this.next(null, qItem.id);
    }

    const value = qItem.value();
    const vtype = value.constructor.name;
    if (vtype === "String") {
      if (this._isAnonShell(value)) {
        return this._exeAnonShell(qItem, value);
      } else {
        return this._exeLookup(qItem);
      }
    } else if (vtype === "Function") {
      return this._functionXer(qItem, value);
    } else if (vtype === "Array") {
      return this._processArray(qItem, value);
    } else if (value.item) {
      if (value.item.dep && !qItem.xqDep) {
        return this._processDep(qItem, value.item.dep);
      } else {
        return this._processTaskObject(qItem);
      }
    }

    this._clap.fail(
      new Error(`Unable to process task ${qItem.name} because value type ${vtype} is unknown and no value.item`)
    );

    return this.next(null, qItem.id);
  }

  _exeAnonShell(qItem, value) {
    const cmd = value.substr(defaults.ANON_SHELL_SIG.length);
    this._emit("execute", {
      type: "shell",
      anon: true,
      qItem,
      cmd
    });
    this._insertDone(qItem);
    exec(cmd, false, (err, output) => this.next(err));
  }

  _exeLookup(qItem) {
    this._emit("execute", {
      type: "lookup",
      qItem
    });
    this._insertDone(qItem);
    qItem.lookup(this._tasks);
    this._enqueue(qItem);
    this.next(null, qItem.id);
  }

  _processDep(qItem, dep) {
    this._emit("execute", {
      type: "dep",
      qItem
    });
    qItem.xqDep = true;
    this._enqueue(qItem);
    this._insertDone(qItem);
    this._enqueue(
      this._createQItem(
        {
          name: `${qItem.name}-dep`,
          value: { top: true, item: dep }
        },
        qItem
      )
    );

    this.next(null, qItem.id);
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
      this._emit("execute", {
        type: "shell",
        anon: false,
        qItem,
        cmd: itemTask
      });
      return exec(itemTask, false, (err, output) => {
        this.next(err);
      });
    } else {
      this._clap.fail(new Error(`Task ${qItem.name} has unrecognize task value type ${type}`));
    }

    return this.next(null, qItem.id);
  }

  _processArray(qItem, tasks, top) {
    const ss = tasks[0] === defaults.SERIAL_SIG;
    if (top || ss) {
      this._processSerialArray(qItem, tasks, ss);
    } else {
      this._processConcurrentArray(qItem, tasks);
    }
  }

  _processSerialArray(qItem, tasks, slice) {
    this._emit("execute", {
      type: "serial-arr",
      qItem,
      array: tasks
    });
    if (slice) {
      tasks = tasks.slice(1);
    }
    this._insertDone(qItem);
    this.queue = tasks
      .map(value => {
        return this._createQItem(this._resolveValueToQItemOptions(`${qItem.name}.S`, value, "serial_child"), qItem);
      })
      .concat(this.queue);
    this.next(null, qItem.id);
  }

  _resolveValueToQItemOptions(name, value, type) {
    if (typeof value === "string" && !this._isAnonShell(value)) {
      name = value;
      value = undefined;
    }

    const anon = typeof value === "function";
    return {
      name,
      value,
      anon,
      type
    };
  }

  _isAnonShell(value) {
    return value.startsWith(defaults.ANON_SHELL_SIG);
  }

  _processConcurrentArray(qItem, tasks) {
    this._emit("execute", {
      type: "concurrent-arr",
      qItem,
      array: tasks
    });
    this._insertDone(qItem);
    Insync.parallel(
      tasks.map(value => cb => {
        this._emit("spawn-async");
        const xqtor = new XQtor({
          tasks: this._tasks,
          done: err => {
            this._emit("done-async");
            process.nextTick(() => cb(err, value));
          },
          clap: this._clap
        });
        xqtor.queue.push(
          this._createQItem(this._resolveValueToQItemOptions(`${qItem.name}.C`, value, "concurrent_child"), qItem)
        );
        xqtor.next();
      }),
      () => this.next()
    );
  }

  _processMoreFromFn(qItem, value) {
    const tof = typeof value;

    if (tof !== "string" && tof !== "function" && !Array.isArray(value)) {
      return;
    }

    const qi = this._createQItem(
      this._resolveValueToQItemOptions(`${qItem.name}.fR`, value, "func_returned_child"),
      qItem
    );
    this._enqueue(qi);
  }

  _functionXer(qItem, fn) {
    this._emit("execute", {
      type: "function",
      anon: qItem.anon,
      qItem
    });

    const done = (err, value) => {
      if (value) {
        this._processMoreFromFn(qItem, value);
      }
      this.next(err, qItem && qItem.id);
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
    this._emit("done-item", {
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

  _emit(event, data) {
    try {
      this._clap.emit(event, data);
    } catch (err) {
      this._clap.fail(err);
    }
  }

  _createQItem(options, parent) {
    return this._clap.xqTree.create(options, parent);
  }
}

module.exports = XQtor;

"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const Insync = require("insync");
const chalk = require("chalk");
const genXqId = require("./gen-xqid");
const XQItem = require("./xqitem");
const exec = require("xsh").exec;
const parseArray = require("./util/parse-array");

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
      return this._processMark(qItem);
    }

    if (this._clap.failed && this._clap.stopOnError) {
      return this.next(null, qItem.id);
    }

    const value = qItem.value();
    const vtype = value.constructor.name;
    if (vtype === "String") {
      const anonShell = this._parseAnonShell(value);
      if (anonShell) return this._shellXer(qItem, anonShell, true);

      return this._processLookup(qItem);
    } else if (vtype === "Function") {
      return this._functionXer(qItem, value);
    } else if (vtype === "Array") {
      return this._processArray(qItem, value);
    } else if (value.item) {
      const dep = value.item.dep;
      if (dep && !qItem.xqDep) {
        return this._processDep(qItem, dep);
      } else {
        return this._processTaskObject(qItem);
      }
    }

    this._clap.fail(
      new Error(
        `Unable to process task ${
          qItem.name
        } because value type ${vtype} is unknown and no value.item`
      )
    );

    return this.next(null, qItem.id);
  }

  _isAnonShell(value) {
    return value.startsWith(defaults.ANON_SHELL_SIG);
  }

  _parseAnonShell(value) {
    if (this._isAnonShell(value)) {
      return value.substr(defaults.ANON_SHELL_SIG.length);
    }
    return undefined;
  }

  _isStrArray(value) {
    return value.startsWith(defaults.STR_ARRAY_SIG);
  }

  _parseStrArray(value) {
    if (this._isStrArray(value)) {
      return parseArray(value.substr(defaults.STR_ARRAY_SIG.length - 1));
    }
    return undefined;
  }

  _processLookup(qItem) {
    this._emit("execute", {
      type: "lookup",
      qItem
    });
    // lookup is sync; should not insert mark for it
    try {
      const found = qItem.lookup(this._tasks);
      this._enqueue(qItem);
      this.next(null, qItem.id);
      if (found.search) {
        this._clap.emit("search", { qItem, found });
        qItem.setNamespace(found.ns);
      }
    } catch (error) {
      if (error.optional) {
        this._clap.emit("not-found", error);
        this.next();
      } else {
        this.next(error, qItem.id);
      }
    }
  }

  _processDep(qItem, dep) {
    this._emit("dep", {
      qItem
    });
    qItem.xqDep = true; // item's dep has been processed
    this._enqueue(qItem);
    const di = this._createQItem(
      {
        name: qItem.name,
        value: { top: true, depDee: qItem, item: { task: dep } }
      },
      this._clap.xqTree.parent(qItem)
    );

    this._enqueue(di);

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
      const parsedArray = this._parseStrArray(itemTask);
      if (parsedArray) return this._processArray(qItem, parsedArray, value.top);
      return this._shellXer(qItem, itemTask);
    } else {
      this._clap.fail(new Error(`Task ${qItem.name} has unrecognize task value type ${type}`));
    }

    return this.next(null, qItem.id);
  }

  _processArray(qItem, tasks, top) {
    const ss = tasks[0] === defaults.SERIAL_SIG;
    if (top || ss) {
      this._serialArrayXer(qItem, tasks, ss);
    } else {
      this._concurrentArrayXer(qItem, tasks);
    }
  }

  _serialArrayXer(qItem, tasks, slice) {
    this._emit("execute", {
      type: "serial-arr",
      qItem,
      array: tasks
    });

    if (slice) {
      tasks = tasks.slice(1);
    }
    this._insertMark(qItem);
    this.queue = tasks
      .map(value => {
        return this._createQItem(
          this._resolveValueToQItemOptions(qItem.ns, `${qItem.name}.S`, value, "serial_child"),
          qItem
        );
      })
      .concat(this.queue);
    this.next(null, qItem.id);
  }

  _resolveValueToQItemOptions(ns, name, value, type) {
    if (typeof value === "string" && !this._isAnonShell(value)) {
      name = value;
      value = undefined;
    }

    const anon = typeof value === "function";
    return {
      ns,
      name,
      value,
      anon,
      type
    };
  }

  _concurrentArrayXer(qItem, tasks) {
    this._emit("execute", {
      type: "concurrent-arr",
      qItem,
      array: tasks
    });
    this._insertMark(qItem);
    const xqtors = [];
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
        const options = this._resolveValueToQItemOptions(
          qItem.ns,
          `${qItem.name}.C`,
          value,
          "concurrent_child"
        );
        const item = this._createQItem(options, qItem);
        if (options.value === undefined) {
          xqtor._processLookup(item);
        } else {
          xqtor._enqueue(item);
          xqtor.next();
        }
      }),
      () => this.next()
    );
  }

  _shellXer(qItem, cmd, anon) {
    this._emit("execute", {
      type: "shell",
      anon,
      qItem,
      cmd
    });
    this._insertMark(qItem);
    exec(false, cmd, err => this.next(err, qItem.id));
  }

  _processMoreFromFn(qItem, value, callback) {
    let tof = typeof value;

    if (tof === "string") {
      const parsedArray = this._parseStrArray(value);
      if (parsedArray) value = parsedArray;
      tof = typeof value;
    }

    if (tof !== "string" && tof !== "function" && !Array.isArray(value)) {
      return;
    }

    const qi = this._createQItem(
      this._resolveValueToQItemOptions(qItem.ns, `${qItem.name}.fR`, value, "func_returned_child"),
      qItem
    );
    if (callback) {
      assert(
        typeof callback === "function",
        `${qItem.name} callback from function calling run is not a function`
      );
      this._insertMark(qItem, callback);
    }
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
      this.next(err, qItem.id);
    };

    try {
      this._insertMark(qItem);
      const run = (value, cb) => this._processMoreFromFn(qItem, value, cb);

      if (fn.length > 0) {
        return fn.call({ run, argv: qItem.argv }, done);
      }
      const x = fn.call({ run, argv: qItem.argv });
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

  _processMark(qItem) {
    const value = qItem.value();
    const xqItem = this._clap.xqTree.item(value.xqId);
    const endTime = Date.now();
    xqItem.pending--;
    assert(xqItem.pending >= 0, "xqItem pending not >= 0");
    const data = {
      qItem,
      xqItem,
      elapse: endTime - value.startTime,
      startTime: value.startTime,
      endTime,
      hrStartTime: value.hrStartTime,
      hrElapse: process.hrtime(value.hrStartTime)
    };
    if (value.callback) {
      value.callback(this._clap.failed, data);
    } else {
      this._emit("done-item", data);
    }
    this.next();
  }

  _makeXqMarkItem(qItem, callback) {
    // do not add marking item to tree
    const mark = new XQItem({
      name: `mark_${qItem.name}`,
      value: {
        startTime: Date.now(),
        hrStartTime: process.hrtime(),
        callback,
        xqId: qItem.id
      }
    });
    mark.mark = true;
    qItem.pending++;
    return mark;
  }

  _insertMark(qItem, callback) {
    const x = this._makeXqMarkItem(qItem, callback);
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

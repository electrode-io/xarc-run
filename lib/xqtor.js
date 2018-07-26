"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const Insync = require("insync");
const chalk = require("chalk");
const genXqId = require("./gen-xqid");
const XQItem = require("./xqitem");
const exec = require("xsh").exec;
const parseArray = require("./util/parse-array");
const childProc = require("child_process");

const STAGE_FINALLY = "finally";

/*
 * Task executor (XQtor)
 *
 * Tasks are added to a LIFO stack using an array.
 *
 * - Concurrent tasks are executed by creating a new XQtor for each one
 *   and managed using Insync.parallel.
 * - Serial tasks are all added to the top of the "stack" in reverse order
 * - Some items are actions that cause more items to be created and pushed
 *   into the stack.  Like looking up the task of a task name.
 * - As each task is completed, the XQtor's next is invoked to pop items
 *   from the stack for processing.
 * - A mark item is added to the stack before each task so when a mark
 *   is seen, error is checked and done event is emitted.
 *
 */
class XQtor {
  constructor(options) {
    this._tasks = options.tasks;
    this._done = options.done;
    this._clap = options.clap;
    this.xqItems = [];
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

    if (this.xqItems.length > 0) {
      this.execute();
    } else {
      this._done(this._clap.failed);
    }
  }

  execute() {
    assert(this.xqItems.length > 0, "no next task");

    const qItem = this.popItem();
    if (qItem.mark) {
      return this._processMark(qItem);
    }

    if (this._clap.failed && !qItem.isFinally && this._clap.stopOnError) {
      return this.next(null, qItem.id);
    }

    const value = qItem.value();
    const vtype = value.constructor.name;
    if (vtype === "String") {
      if (this._isAnonShell(value)) {
        return this._shellXer(qItem, this._parseAnonShell(value), true);
      }

      return this._processLookup(qItem);
    } else if (vtype === "Function" || vtype === "AsyncFunction") {
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

  pushMarkItem(qItem, callback) {
    const x = this._makeXqMarkItem(qItem, callback);
    this.pushItem(x);
    return x;
  }

  pushItem(qItem) {
    this.xqItems.push(qItem);
  }

  popItem() {
    return this.xqItems.pop();
  }

  _isAnonShell(value) {
    if (value.startsWith(defaults.ANON_SHELL_OPT_SIG)) return true;
    if (value.startsWith(defaults.ANON_SHELL_SIG)) return true;
  }

  _parseAnonShell(value) {
    if (typeof value !== "string") return value;

    let cmd = value;
    let flags = {};
    let error;
    if (this._isAnonShell(value)) {
      // support options like ~(tty,spawn,sync)$

      if (value.startsWith(defaults.ANON_SHELL_OPT_SIG)) {
        const ix = value.indexOf(
          defaults.ANON_SHELL_OPT_CLOSE_SIG,
          defaults.ANON_SHELL_OPT_SIG.length
        );

        if (ix > defaults.ANON_SHELL_OPT_SIG.length) {
          const so = value.substring(defaults.ANON_SHELL_OPT_SIG.length, ix);
          flags = so.split(",").reduce((a, o) => {
            a[o.trim()] = true;
            return a;
          }, flags);
          cmd = value.substr(ix + defaults.ANON_SHELL_OPT_CLOSE_SIG.length);
        } else {
          error = new Error(`Missing )$ in shell task: ${value}`);
        }
      } else {
        cmd = value.substr(defaults.ANON_SHELL_SIG.length);
      }
    }

    return { flags, cmd, error };
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
      this.pushItem(qItem);
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
    this.pushItem(qItem);
    const di = this._createQItem(
      {
        name: qItem.name,
        value: { top: true, depDee: qItem, item: { task: dep } }
      },
      this._clap.xqTree.parent(qItem)
    );

    this.pushItem(di);

    this.next(null, qItem.id);
  }

  _processTaskObject(qItem) {
    const value = qItem.value();
    const stage = qItem.stage || "task";
    const itemTask = value.item[stage] || value.item;
    const type = itemTask.constructor.name;
    if (type === "Array") {
      return this._processArray(qItem, itemTask, value.top);
    } else if (type === "Function" || type === "AsyncFunction") {
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
    this.pushMarkItem(qItem);
    this.xqItems = this.xqItems.concat(
      tasks
        .map(value => {
          return this._createQItem(
            this._resolveValueToQItemOptions(qItem.ns, `${qItem.name}.S`, value, "serial_child"),
            qItem
          );
        })
        .reverse()
    );
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
    this.pushMarkItem(qItem);
    const xqtors = [];
    Insync.parallel(
      tasks.map(value => cb => {
        this._emit("spawn-async");
        const xqtor = new XQtor({
          tasks: this._tasks,
          clap: this._clap,
          done: err => {
            this._emit("done-async");
            process.nextTick(() => cb());
          }
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
          xqtor.pushItem(item);
          xqtor.next();
        }
      }),
      () => this.next()
    );
  }

  _shellXer(qItem, cmdVal, anon) {
    cmdVal = this._parseAnonShell(cmdVal);

    const { flags, cmd } = cmdVal;

    const item = qItem.value().item || {};

    Object.assign(flags, item.flags);

    this._emit("execute", {
      type: "shell",
      anon,
      qItem,
      cmd,
      flags
    });

    if (cmdVal.error) {
      setTimeout(() => this.next(cmdVal.error, qItem.id), 0);
      return;
    }

    this.pushMarkItem(qItem);
    const env = Object.assign({}, process.env);

    if (qItem.err) {
      env.XCLAP_ERR = qItem.err.message || "true";
    }

    if (this._clap.failed || qItem.err) {
      env.XCLAP_FAILED = "true";
    }

    const watch = { finish: false };
    const done = err => {
      if (watch.finish) return 0;
      watch.finish = true;
      return this.next(err, qItem.id);
    };

    let child;

    if (flags.tty || flags.spawn) {
      const spawnOpts = { shell: true, env };
      Object.assign(spawnOpts, item.options);
      if (flags.tty) spawnOpts.stdio = "inherit";

      if (flags.sync) {
        child = childProc.spawnSync(cmd, spawnOpts);
        if (child.error) {
          done(child.error);
        } else if (child.status === 0) {
          done();
        } else {
          done(new Error(`cmd "${cmd}" exit code ${child.status}`));
        }
      } else {
        child = childProc.spawn(cmd, spawnOpts);
        child.on("close", code => {
          if (code === 0) return done();
          return done(new Error(`cmd "${cmd}" exit code ${code}`));
        });
      }
    } else {
      child = exec({ silent: false, env }, cmd, done);
    }

    if (!watch.finish) {
      watch.cancel = () => {
        child.kill();
        done();
      };
      this._watchFailure(watch);
    }
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
      this.pushMarkItem(qItem, callback);
    }
    this.pushItem(qi);
  }

  _functionXer(qItem, fn) {
    this._emit("execute", {
      type: "function",
      anon: qItem.anon,
      qItem
    });

    const watch = { finish: false, qItem };
    const done = (err, value) => {
      if (watch.finish) return;
      watch.finish = true;
      if (value) {
        this._processMoreFromFn(qItem, value);
      }
      this.next(err, qItem.id);
    };

    watch.cancel = done;

    try {
      this.pushMarkItem(qItem);
      const run = (value, cb) => this._processMoreFromFn(qItem, value, cb);

      const context = { run, argv: qItem.argv, err: qItem.err, failed: this._clap.failed };

      // task function takes callback, expect async behavior
      if (fn.length > 0) {
        this._watchFailure(watch);
        return fn.call(context, done);
      }

      const x = fn.call(context);
      if (!x || typeof x.then !== "function") {
        // asume no async behavior in task function
        return done(null, x);
      }

      // x.then is a function, assume task function returned a promise
      this._watchFailure(watch);
      return x.then(v => done(null, v), done);
    } catch (err) {
      return done(err);
    }
  }

  _watchFailure(watch) {
    if (this._clap.stopOnError !== "full") return undefined;

    return setTimeout(() => {
      if (watch.finish) return 0;
      if (this._clap.failed) {
        this._clap.emit("fail-cancel", watch);
        return watch.cancel();
      }
      return this._watchFailure(watch);
    }, 50).unref();
  }

  _processMark(qItem) {
    const value = qItem.value();
    const xqItem = this._clap.xqTree.item(value.xqId);
    const endTime = Date.now();
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

    const xqValue = xqItem.value();

    if (xqValue.item && xqValue.item[STAGE_FINALLY] && !xqItem.isFinally) {
      xqItem.stage = STAGE_FINALLY;
      xqItem.isFinally = true;
      this.pushItem(xqItem);
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
    return mark;
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

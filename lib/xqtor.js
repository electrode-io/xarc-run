"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const Insync = require("insync");
const XQItem = require("./xqitem");
const exec = require("xsh").exec;
const parseArray = require("./util/parse-array");
const childProc = require("child_process");
const unwrapNpmCmd = require("unwrap-npm-cmd");
const updateEnv = require("./util/update-env");
const NixClap = require("nix-clap");

const STAGE_FINALLY = "finally";

const isSerial = x => x[0] === defaults.SERIAL_SIG || x[0] === defaults.SERIAL_SYM;
const isConcurrent = x => x[0] === defaults.CONCURRENT_SYM;

const isReadableStream = x => Boolean(x && x.pipe && x.on && x._readableState);

/*
 * Task executor (XQtor)
 *
 * Tasks are added to a stack using an array.
 *
 * - Each concurrent tasks array is executed with a new XQtor and Insync.parallel.
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

    if (this._clap._isStop || (this._clap.failed && !qItem.isFinally && this._clap.stopOnError)) {
      return this.next(null, qItem.id);
    }

    const value = qItem.value();
    if (value === defaults.STOP_SYM) {
      this._clap.actStop();
      return this.next(null, qItem.id);
    }

    const vtype = value.constructor.name;
    if (vtype === "XTaskSpec") {
      if (value.type === "exec") {
        return this._shellXer(qItem, value, true);
      } else if (value.type === "env") {
        return this._envXer(qItem, value);
      }
      this._clap.fail(
        new Error(`Unable to process XTaskSpec type ${value.type} for task ${qItem.name}`)
      );
    } else if (vtype === "String") {
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
    } else {
      this._clap.fail(
        new Error(`Unable to process task ${qItem.name} \
because value type ${vtype} is unknown and no value.item`)
      );
    }

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
    let sig;
    if ((sig = defaults.ANON_SHELL_OPT_SIG.find(x => value.startsWith(x)))) {
      return { sig, opt: true };
    }
    if ((sig = defaults.ANON_SHELL_SIG.find(x => value.startsWith(x)))) {
      return { sig, opt: false };
    }
    return false;
  }

  _parseShellFlags(flags, value) {
    const unknowns = [];

    flags = flags.reduce((a, o) => {
      const f = o.trim().toLowerCase();
      if (defaults.SHELL_FLAGS.indexOf(f) < 0) {
        unknowns.push(o);
      } else {
        a[f] = true;
      }
      return a;
    }, {});

    if (unknowns.length) {
      throw new Error(`Unknown flag ${unknowns.join(",")} in shell task: ${value}`);
    }

    return flags;
  }

  _parseAnonShell(value) {
    if (typeof value !== "string") return value;

    let cmd = value;
    let flags = {};
    let error;
    const anon = this._isAnonShell(value);
    if (anon) {
      const { sig, opt } = anon;
      // support options like ~(tty,spawn,sync)$

      if (opt) {
        let ix;
        const closeSig = defaults.ANON_SHELL_OPT_CLOSE_SIG.find(x => {
          ix = value.indexOf(x, sig.length);
          return ix > sig.length;
        });

        if (closeSig) {
          const so = value.substring(sig.length, ix);
          try {
            flags = this._parseShellFlags(so.split(","), value);
          } catch (err) {
            error = err;
          }
          cmd = value.substr(ix + closeSig.length);
        } else {
          error = new Error(
            `Missing ${defaults.ANON_SHELL_OPT_CLOSE_SIG[0]} in shell task: ${value}`
          );
        }
      } else {
        cmd = value.substr(sig.length);
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
    } else if (type === "XTaskSpec") {
      if (itemTask.type === "exec") {
        return this._shellXer(qItem, itemTask);
      } else if (itemTask.type === "env") {
        return this._envXer(qItem, itemTask);
      }
      this._clap.fail(
        new Error(`Unable to process XTaskSpec type ${itemTask.type} for task ${qItem.name}`)
      );
    } else {
      this._clap.fail(new Error(`Task ${qItem.name} has unrecognize task value type ${type}`));
    }

    return this.next(null, qItem.id);
  }

  _processArray(qItem, tasks, top) {
    // check first element for concurrent signature
    // top level task arrays are automatically serial
    // or check first element for serial signature
    if (isConcurrent(tasks) || (!top && !isSerial(tasks))) {
      this._concurrentArrayXer(qItem, tasks);
    } else {
      this._serialArrayXer(qItem, tasks);
    }
  }

  _serialArrayXer(qItem, tasks) {
    if (isSerial(tasks)) {
      tasks = tasks.slice(1);
    }

    this._emit("execute", {
      type: "serial-arr",
      qItem,
      array: tasks
    });

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
    if (isConcurrent(tasks)) {
      tasks = tasks.slice(1);
    }

    this._emit("execute", {
      type: "concurrent-arr",
      qItem,
      array: tasks
    });

    this.pushMarkItem(qItem);
    Insync.parallel(
      tasks.map(value => cb => {
        this._emit("spawn-async", { name: qItem.name });
        const xqtor = new XQtor({
          tasks: this._tasks,
          clap: this._clap,
          done: () => {
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

  _envXer(qItem, cmdVal) {
    this._emit("execute", {
      type: "env",
      qItem,
      cmdVal
    });

    updateEnv(cmdVal.options.env, process.env, cmdVal.options.override);
    return this.next();
  }

  _shellXer(qItem, cmdVal, anon) {
    cmdVal = this._parseAnonShell(cmdVal);

    if (cmdVal.error) {
      setTimeout(() => this.next(cmdVal.error, qItem.id), 0);
      return;
    }

    const { cmd } = cmdVal;
    const xclapOptions = Object.assign({ delayRunMs: 0 }, cmdVal.xclap);
    const options = Object.assign({}, cmdVal.options);

    let { flags } = cmdVal;

    if (typeof flags === "string") {
      flags = this._parseShellFlags(flags.split(","), `XTaskSpec "${flags}"`);
    } else if (Array.isArray(flags)) {
      flags = this._parseShellFlags(flags);
    }

    const item = qItem.value().item || {};

    Object.assign(flags, item.flags);

    setTimeout(() => {
      const execData = {
        type: "shell",
        anon,
        qItem,
        cmd,
        flags,
        cmdVal,
        options,
        item
      };

      this._emit("execute", execData);
      this._doShellXer(execData);
    }, xclapOptions.delayRunMs);
  }

  _doShellXer({ anon, qItem, cmd, flags, cmdVal, options, item }) {
    const itemOptions = Object.assign({}, item.options);

    this.pushMarkItem(qItem);
    const env = Object.assign(
      flags.noenv ? {} : Object.assign({}, process.env),
      itemOptions.env,
      options.env
    );

    if (qItem.err) {
      env.XCLAP_ERR = qItem.err.message || "true";
    }

    if (this._clap.failed || qItem.err) {
      env.XCLAP_FAILED = "true";
    }

    let child;

    const watch = { finish: false };
    const done = err => {
      // even if there's error, but if it's due to child being terminated with
      // SIGTERM, then treat that as a normal exit.
      if (this._isChildSigTerm(err, child)) {
        err = null;
      }
      if (watch.finish) return 0;
      watch.finish = true;
      return this.next(err, qItem.id);
    };

    let { tty, spawn, sync, npm } = flags;
    if (npm) {
      tty = spawn = true;
    }

    const cmd2 = unwrapNpmCmd(cmd, { path: env.PATH });

    if (tty || spawn) {
      const spawnOpts = { shell: true };
      Object.assign(spawnOpts, itemOptions, options, { env });
      if (tty) spawnOpts.stdio = "inherit";

      if (sync) {
        child = childProc.spawnSync(cmd2, spawnOpts);
        if (child.error) {
          done(child.error);
        } else if (child.status === 0) {
          done();
        } else {
          done(new Error(`cmd "${cmd}" exit code ${child.status}`));
        }
      } else {
        child = childProc.spawn(cmd2, spawnOpts);
        child.on("close", (code, signal) => {
          if (code === 0 || signal === "SIGTERM") {
            return done();
          }
          return done(new Error(`cmd "${cmd}" exit code ${code}`));
        });
      }
    } else {
      child = exec(Object.assign({ silent: false }, itemOptions, options, { env }), cmd2, done);
    }

    if (!watch.finish) {
      this._handleChildTask(child, cmd);
      watch.cancel = () => {
        child.kill();
        done();
      };
      this._watchFailure(watch);
    }
  }

  _handleChildTask(child, cmd) {
    if (child && child instanceof childProc.ChildProcess) {
      const sym = Symbol(cmd);
      this._clap.addTaskChild(child, sym);
      child.on("exit", () => {
        this._clap.removeTaskChild(child, sym);
      });
      return child;
    }
  }

  _processMoreFromFn(qItem, value, callback) {
    let tof = typeof value;

    if (tof === "string") {
      const parsedArray = this._parseStrArray(value);
      if (parsedArray) value = parsedArray;
      tof = typeof value;
    }

    if (
      !value ||
      (tof !== "string" &&
        tof !== "function" &&
        !Array.isArray(value) &&
        value.constructor.name !== "XTaskSpec" &&
        value !== defaults.STOP_SYM)
    ) {
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

  _isChildSigTerm(err, child) {
    return err && err.code === null && child && child.signalCode === "SIGTERM";
  }

  _handleStream(val) {
    if (!isReadableStream(val)) {
      return val;
    }

    return new Promise((resolve, reject) => {
      const handle = err => {
        val.removeListener("end", handle);
        val.removeListener("error", handle);
        return err ? reject(err) : resolve();
      };

      val.once("end", handle);
      val.once("error", handle);
    });
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
      const taskItem = qItem.value().item || {};

      const handlers = {};
      const unknownOptions = [];

      handlers["unknown-option"] =
        taskItem.allowUnknownOptions !== false
          ? false
          : name => {
              unknownOptions.push(name);
            };

      const argp = new NixClap({ handlers }).init({ ...taskItem.argOpts }).parse(qItem.argv, 1);

      if (unknownOptions.length > 0) {
        return done(
          new Error(`Unknown options for task ${qItem.name}: ${unknownOptions.join(", ")}`)
        );
      }

      const context = {
        run,
        argv: qItem.argv,
        args: qItem.argv.slice(1),
        argp,
        argOpts: argp.opts,
        err: qItem.err,
        failed: this._clap.failed
      };

      if (fn.length > 1) {
        // takes two params, pass in context and done callback
        this._watchFailure(watch);
        return fn.call(context, context, done);
      }

      if (fn.constructor.name !== "AsyncFunction" && fn.length > 0) {
        // non async function that takes 1 param, check if it wants the context
        // or a callback.
        const fnStr = fn.toString().replace(/\s/g, "");
        const matchParam = x => {
          return (
            fnStr.startsWith(`${x}=>`) ||
            fnStr.match(new RegExp(`\\(${x}[^\\)]*\\)=>`)) ||
            fnStr.match(new RegExp(`function[^\\(]*\\(${x}[^\\)]*\\){`)) ||
            fnStr.match(new RegExp(`[^\(]*\\(${x}[^\\)]*\\){`))
          );
        };

        const takeContext = ["ctx", "context"].find(matchParam);

        if (!takeContext) {
          // non async task function takes callback, expect async behavior
          this._watchFailure(watch);
          return fn.call(context, done);
        }
      }

      const x = this._handleStream(fn.call(context, context));

      // handling a exec/spawn child from a function
      const cmd = `ChildProcess of function task ${qItem.name}`;
      const child = this._handleChildTask(x && x.child, cmd) || this._handleChildTask(x, cmd);

      if (!x || typeof x.then !== "function") {
        // assume no async behavior in task function
        return done(null, x);
      }

      // x.then is a function, assume task function returned a promise
      this._watchFailure(watch);
      return x.then(
        v => done(null, v),
        err => {
          // treat child process that got SIGTERM as exited normally
          if (this._isChildSigTerm(err, child)) {
            done();
          } else {
            done(err);
          }
        }
      );
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

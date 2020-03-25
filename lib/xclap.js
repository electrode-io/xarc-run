"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const chalk = require("chalk");
const XQtor = require("./xqtor");
const XTasks = require("./xtasks");
const XQTree = require("./xqtree");
const logger = require("./logger");
const EventEmitter = require("events");
const printTasks = require("./print-tasks");
const jaroWinkler = require("jaro-winkler");
const XTaskSpec = require("./xtask-spec");
const xsh = require("xsh");

// full - full stop, interrupting all pending async tasks
// soft - allow pending async tasks to complete, but no more new tasks
// "" - march on
const STOP_ON_ERROR = ["", "soft", "full"];

function _decorateTasks(type, name, ...tasks) {
  assert(tasks.length > 0, `${name} no tasks passed`);
  tasks = tasks.filter(x => x);
  if (tasks.length === 1) {
    tasks = tasks[0];
    // user passed single argument that's not an array
    // assume it's a single task where serial/concurrent is N/A
    if (!Array.isArray(tasks)) return tasks;
  }

  return [type].concat(tasks);
}

function _concurrent(...tasks) {
  return _decorateTasks(defaults.CONCURRENT_SYM, "xclap.concurrent", ...tasks);
}

class XClap extends EventEmitter {
  constructor(namespace, tasks) {
    super();
    this._tasks = new XTasks(namespace, tasks);
    this.failed = null;
    this.xqTree = new XQTree();
    this._logger = logger;
    this._pending = 0;
    this._taskChildren = {};
    this._isStop = false;
    this.on("spawn-async", () => this._pending++);
    this.on("done-async", () => this._pending--);
  }

  get stopOnError() {
    return this._stopOnError;
  }

  set stopOnError(v) {
    if (v === false) {
      this._stopOnError = "";
    } else if (v === true) {
      this._stopOnError = "full";
    } else {
      assert(
        STOP_ON_ERROR.indexOf(v) >= 0,
        `stopOnError must be true or false, or one of ${STOP_ON_ERROR.map(JSON.stringify).join(
          ", "
        )}`
      );
      this._stopOnError = v;
    }

    return this;
  }

  // priority: lower value => lower priority when searching namespace for a task
  load(namespace, tasks, priority = 1) {
    this._tasks.load(namespace, tasks, priority);
    return this;
  }

  addTaskChild(child, sym) {
    this._taskChildren[sym] = child;
    return this._taskChildren;
  }

  removeTaskChild(child, sym) {
    delete this._taskChildren[sym];
    return this._taskChildren;
  }

  run(name, done) {
    if (this.stopOnError === undefined) {
      this.stopOnError = true;
    }
    if (this._tasks.hasFinally() && this.stopOnError === "full") {
      this.emit("warn-finally");
    }
    done = done || this._exitOnError.bind(this);
    const xqtor = new XQtor({ tasks: this._tasks, done, clap: this });

    try {
      if (typeof name === "string") {
        this.emit("run", { name });
        xqtor.pushItem(this.xqTree.create({ name }));
      } else {
        this.emit("run", { tasks: name });
        xqtor.pushItem(this.xqTree.create({ name: "run", value: name }));
      }
      xqtor.next();
    } catch (err) {
      done([err]);
    }
    return this;
  }

  printTasks() {
    printTasks(this._tasks);
    return this;
  }

  countTasks() {
    return this._tasks.count();
  }

  getNamespaces() {
    return this._tasks._namespaces;
  }

  fail(err) {
    if (!this.failed) {
      this.failed = err;
    } else {
      this.failed.more = this.failed.more || [];
      this.failed.more.push(err);
    }
    return this;
  }

  waitAllPending(done) {
    const wait = () => {
      if (this._pending === 0) {
        return done();
      }
      setTimeout(wait, 10);
    };
    process.nextTick(wait);
    return this;
  }

  _showSimilarTasks(res) {
    const names = this._tasks.fullNames();
    const distances = names
      .map(name => {
        name = name.split("/")[1];
        if (name.startsWith(".")) return false;
        const dis = jaroWinkler(res.name, name) * 100000;
        return { dis, name };
      })
      .filter(x => x)
      .sort((a, b) => b.dis - a.dis);
    const similars = distances.slice(0, 5).map(x => chalk.cyan(x.name));
    console.log(`  Maybe try: ${similars.join(", ")}`);
  }

  _exitOnError(err) {
    if (!err) {
      return;
    }

    console.log(chalk.bold.red.inverse(" Execution Failed - Errors: "));
    const errors = [].concat(err, err.more).filter(x => x);
    errors.forEach((e, x) => {
      const idx = chalk.bold.red.inverse(` ${x + 1} `);
      if (!e.stack) {
        console.log(idx, e);
        return;
      }
      const lines = e.stack.split("\n");
      console.log(idx, e.message);
      if (e.name && e.name.indexOf("AssertionError") >= 0) return;
      if (e.code === "TASK_NOT_FOUND") {
        this._showSimilarTasks(e.res);
        return;
      }
      if (lines.length < 2) return;
      if (lines[1].indexOf("xsh/lib/exec.js") >= 0) return;
      const cleaned = lines.filter(l => {
        return (
          // exclude stack for node.js internal modules and xclap's own files
          !l.includes(`(internal/`) && !l.includes("/node_modules/xclap/lib/")
        );
      });
      // start at 1 to exclude the message that's the first line in stack output
      for (let i = 1; i < cleaned.length; i++) {
        console.log(
          chalk.gray(
            /* istanbul ignore next */
            process.cwd().length > 2 ? xsh.pathCwd.replace(cleaned[i], ".", "g") : cleaned[i]
          )
        );
      }
    });
    this.exit(1);
  }

  exit(code) {
    if (this.stopOnError) {
      process.exit(code);
    }
  }

  killTaskChildren() {
    setTimeout(() => {
      const children = this._taskChildren;
      this._taskChildren = {};
      const symbols = Object.getOwnPropertySymbols(children);
      symbols.forEach(sym => {
        children[sym].kill();
      });
    }, 10);
  }

  stop() {
    this.killTaskChildren();
    this._isStop = true;
  }

  exec(spec, options) {
    if (Array.isArray(spec) || typeof spec === "string") {
      if (typeof options === "string" || Array.isArray(options)) {
        options = { flags: options };
      }
      return new XTaskSpec(Object.assign({ cmd: spec }, options));
    } else if (typeof spec === "object") {
      return new XTaskSpec(spec);
    } else {
      throw new Error(
        `xclap.exec - unknown spec type ${typeof spec}: must be a string, array, or an object`
      );
    }
  }

  env(spec) {
    return new XTaskSpec(Object.assign({ type: "env", env: spec }));
  }

  // concurrent([task1, task2, ...]) or concurrent(task1, task2, ...)
  concurrent(...tasks) {
    return _concurrent(...tasks);
  }

  // alias for concurrent
  parallel(...tasks) {
    return _concurrent(...tasks);
  }

  // serial([task1, task2, ...]) or concurrent(task1, task2, ...)
  serial(...tasks) {
    return _decorateTasks(defaults.SERIAL_SYM, "xclap.serial", ...tasks);
  }
}

module.exports = XClap;

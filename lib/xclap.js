"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const chalk = require("chalk");
const XQtor = require("./xqtor");
const XTasks = require("./xtasks");
const XQItem = require("./xqitem");
const XQTree = require("./xqtree");

const tasks = {
  xfoo1: cb => {
    setTimeout(() => {
      console.log("hello, this is xfoo1");
      cb();
    }, 100);
  },
  xfoo2: `echo "a direct shell command xfoo2"`,
  xfoo3: `echo "a direct shell command xfoo3"`,
  xfoo4: cb => {
    throw new Error("xfoo4 failed");
    setTimeout(() => {
      console.log("hello, this is xfoo4");
      cb();
    }, 200);
  },
  a: cb => {
    const i = setInterval(() => console.log("aaaaa"), 50);
    setTimeout(() => {
      clearInterval(i);
      cb();
    }, 200);
  },
  b: cb => {
    const i = setInterval(() => console.log("bbbb"), 50);
    setTimeout(() => {
      clearInterval(i);
      cb();
    }, 200);
  },
  c: cb => {
    const i = setInterval(() => console.log("cccc"), 50);
    setTimeout(() => {
      clearInterval(i);
      cb();
    }, 200);
  },
  foo2a: [
    "xfoo1",
    "xfoo2",
    "~$echo test anon shell",
    [".", "a", "b"],
    () => console.log("anonymous"),
    "foo3",
    [
      "a",
      "b",
      ["a", "c"],
      "xfoo4",
      "b",
      "xfoo4",
      () => console.log("concurrent anon")
    ],
    "xfoo4"
  ],
  foo2: ["foo2a"],
  // foo2: ["xfoo1", "xfoo2", "foo3", "xfoo4"],
  foo3Dep: cb => {
    console.log("this is foo3Dep");
    cb();
  },
  foo3: {
    desc: "description for task foo3",
    dep: ["foo3Dep"],
    task: () => {
      console.log("function task for foo3");
      // setTimeout(cb, 1000);
    }
  }
};

// in an array, each element can be the name of another task,
// an array of task, or a function directly

// a function task can return an array as more tasks to be executed
// (direct return or resolved by promise or as result to callback)

// The this argument for function task points to an execution
// context which can be used to run more tasks enclosed in current level

const taskArr = [
  ["foo1", "foo2"], // subarray, first element not ".", execute entire array concurrently
  [".", "foo1", "foo2"] // subarray, first element "." => execute serially
];

/*
  Concurrent Execution

  - Need to spawn off N independent executors at the same time
  - Each executor should have its own independent execution queue

  Serial Execution

  - Use same executor
  - Push tasks back into queue

*/

class XClap {
  constructor(namespace, tasks) {
    this._tasks = new XTasks(namespace, tasks);
    this.failed = false;
    this.stopOnError = true;
    this.xqTree = new XQTree();
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

const xl = new XClap(tasks);
xl.run("foo2");

"use strict";

const xclap = require("../..");

const tasks = {
  xfoo1: cb => {
    setTimeout(() => {
      console.log("hello, this is xfoo1");
      cb();
    }, 200);
  },
  xfoo2: `echo "a direct shell command xfoo2"`,
  xfoo3: `echo "a direct shell command xfoo3"`,
  xfoo4: cb => {
    setTimeout(() => {
      console.log("hello, this is xfoo4");
      cb();
    }, 80);
  },
  a: cb => {
    let i,
      n = 0;
    i = setInterval(() => {
      if (n++ === 3) {
        clearInterval(i);
        cb();
      } else {
        console.log("aaaaa");
      }
    }, 40);
  },
  b: cb => {
    let i,
      n = 0;
    i = setInterval(() => {
      if (n++ === 3) {
        clearInterval(i);
        cb();
      } else {
        console.log("bbbb");
      }
    }, 40);
  },
  c: cb => {
    let i,
      n = 0;
    i = setInterval(() => {
      if (n++ === 3) {
        clearInterval(i);
        cb();
      } else {
        console.log("cccc");
      }
    }, 40);
  },
  foo2a: [
    "xfoo1",
    "xfoo2",
    "~$echo test anon shell",
    [".", "a", "b"],
    () => console.log("anonymous"),
    "foo3",
    ["a", "b", ["a", "c"], "xfoo4", "b", "xfoo4", () => console.log("concurrent anon")],
    "xfoo4"
  ],
  xerr: cb => {
    throw new Error("xerr");
  },
  foo2ba: [
    "xfoo1",
    "xfoo2",
    "~$echo test anon shell",
    [".", "a", "b"],
    () => console.log("anonymous"),
    "foo3",
    ["a", "b", ["/a", "c"], "xerr", "b", "xerr", () => console.log("concurrent anon")],
    "xfoo4"
  ],
  foo1: "sample1-foo1",
  foo2: ["foo2a"],
  foo2b: ["foo2ba"],
  foo3Dep: cb => {
    console.log("this is foo3Dep");
    cb();
  },
  foo3: {
    desc: "description for task foo3",
    dep: ["foo3Dep"],
    task: () => {
      console.log("function task for foo3");
    }
  },
  foo4Dep: cb => {
    console.log("this is foo4Dep");
    cb();
  },
  foo4: {
    desc: "description for task foo4",
    dep: ["foo4Dep"],
    task: () => {
      console.log("function task for foo4");
    },
    finally: () => console.log("foo4 finally")
  },
  foo5a: xclap.concurrent(
    "~$echo foo5a 1",
    xclap.exec("echo foo5a 2", { execOptions: { env: { a: "b" } } })
  )
};

module.exports = tasks;

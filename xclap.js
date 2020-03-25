"use strict";
const xclap = require(".");

const xsh = require("xsh");

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
    setTimeout(() => {
      console.log("hello, this is xfoo4");
      cb();
    }, 20);
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
    }, 10);
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
    }, 10);
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
    }, 10);
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
    ["a", "b", ["a", "c"], "xerr", "b", "xerr", () => console.log("concurrent anon")],
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

  foo5a: xclap.exec(["env | grep foo"], {}, { env: { foo: "bar" } }),
  foo5b: [xclap.exec(`echo abc "${process.cwd()}/blah"`), xclap.exec("echo 123", { tty: true })],
  foo5c: `~(noenv)$env`,
  foo5d: xclap.exec("env", { noenv: true }),
  foo4: function() {
    console.log("foo4 task argv", this.argv);
  },
  foo6: xclap.concurrent(["foo", "bar"]),
  foo7: xclap.serial(["foo", "bar"]),
  tty: `~(tty)$node -e "console.log('blah', process.stdout.isTTY, process.env.TERM); process.exit(0);"`,

  ".stop": () => xclap.stop(),
  ".test-stop": xclap.concurrent(
    xclap.serial("~$echo abc", ".exec", "~$echo BAD IF YOU SEE THIS"),
    xclap.serial("~$sleep 1;", ".stop", "~$echo BAD IF YOU SEE THIS ALSO")
  ),
  ".exec": () => xsh.exec(`node -`),
  // a failure from a task should cause child process to be removed
  // without the stop
  ".stop-with-failure": {
    task: xclap.concurrent(
      xclap.serial(
        "~$echo abc",
        `~$node -e "setInterval(() => console.log('hello', Date.now()), 1000)"`,
        "~$echo BAD IF YOU SEE THIS"
      ),
      xclap.serial(
        "~$sleep 5",
        "~$echo hello",
        () => process.exit() // doing this cause node process to stay
        // () => Promise.reject(new Error("foo")) // this cause node process to go away
      )
    )
  }
};

xclap.load("1", tasks);

xclap.load({
  hello: "echo hello world"
});

module.exports = {
  c1: "echo this is c1"
};

"use strict";

const Promise = require("bluebird");
const xclap = require("..");

// sample to test a function task that fails

const tasks = {
  fnFail: () => {
    throw new Error("fnFail throwing");
  },
  fnFoo2: "echo hello from foo2",
  fnFoo: () => {
    console.log("fnFoo");
    return Promise.delay(500).then(() => {
      console.log("fnFoo async");
      return "fnFoo2";
    });
  },
  fooConcurrent: [["fnFoo", "fnFail"]]
};

xclap.stopOnError = "soft";

xclap.load(tasks).run("fooConcurrent");

"use strict";

const xclap = require("..");
const sample1 = require("./fixtures/sample1");

xclap.load({
  foo2: {
    dep: "echo foo2-dep",
    task: "echo this is foo2"
  }
});
xclap.run("foo2");

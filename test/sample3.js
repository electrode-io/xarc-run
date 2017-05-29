"use strict";

const xclap = require("..");
const sample1 = require("./fixtures/sample1");

xclap.load({
  foo2: {
    dep: "echo foo2-dep",
    task: ["foo3"]
  },
  foo3: ["~$echo hello", function () {
    this.run([".", "foo4", () => console.log("blah")], (err, value) => {
      console.log("blah blah");
    })
  }],
  foo4: "echo foo4"
});
xclap.run("foo2");

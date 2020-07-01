"use strict";

const xrun = require("..");

xrun.load({
  foo2: {
    dep: "echo foo2-dep",
    task: ["foo3"]
  },
  foo3: [
    "~$echo hello",
    function() {
      this.run([".", "foo4", () => console.log("blah")], (err, value) => {
        console.log("blah blah");
      });
    }
  ],
  foo4: "echo foo4"
});
xrun.run("foo2");

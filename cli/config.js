"use strict";

const myPkg = require("../package.json");

module.exports = {
  taskFile: "xrun-tasks.js",
  taskFileExt: ["js", "ts"],
  search: ["xrun-tasks", "xrun", "xclap.", "clapfile.", "clap.", "gulpfile."],
  getPkgOpt: pkg => ["xclap", myPkg.name].find(f => pkg.hasOwnProperty(f))
};

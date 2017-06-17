"use strict";

const chalk = require("chalk");

module.exports = {
  help: {
    type: "boolean",
    alias: "h",
    desc: "Show Options or help for tasks"
  },
  version: {
    alias: "v",
    type: "boolean",
    desc: "show xclap version and exits"
  },
  nmbin: {
    type: "boolean",
    alias: "b",
    desc: `add ${chalk.magenta("CWD/node_modules/.bin")} to ${chalk.blue("PATH")}`,
    default: true
  },
  npm: {
    type: "boolean",
    alias: "n",
    desc: `load npm scripts into namespace ${chalk.magenta("npm")}`,
    default: true
  },
  dir: {
    type: "string",
    alias: "d",
    desc: `Set dir to look for ${chalk.green("clap.js")} (default is ${chalk.magenta("CWD")})`,
    default: process.cwd()
  },
  soe: {
    type: "boolean",
    alias: "s",
    desc: "Stop on errors",
    default: true
  },
  list: {
    type: "boolean",
    alias: "l",
    desc: "List all tasks names w/o namespace",
    default: false
  },
  "list-full": {
    type: "boolean",
    alias: "f",
    desc: "List all tasks names with namespace",
    default: false
  },
  quiet: {
    type: "boolean",
    alias: "q",
    desc: "Do not output any logs",
    default: false
  }
};

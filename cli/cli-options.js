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
  cwd: {
    type: "string",
    alias: "w",
    desc: `Set xclap's ${chalk.magenta("CWD")}`,
    requiresArg: true
  },
  dir: {
    type: "string",
    alias: "d",
    desc: `Set dir to look for ${chalk.green("clap.js")} (default is ${chalk.magenta("CWD")})`,
    requiresArg: true
  },
  npm: {
    type: "boolean",
    alias: "n",
    desc: `load npm scripts into namespace ${chalk.magenta("npm")}`,
    default: true
  },
  nmbin: {
    type: "boolean",
    alias: "b",
    desc: `add ${chalk.magenta("CWD/node_modules/.bin")} to ${chalk.blue("PATH")}`,
    default: true
  },
  list: {
    type: "string",
    alias: "l",
    desc: "List tasks names from list of comma separated namespaces (default is all namespaces)"
  },
  full: {
    type: "boolean",
    alias: "f",
    desc: "--list show tasks names with namespace",
    default: false
  },
  ns: {
    type: "boolean",
    alias: "m",
    desc: "List all namespaces"
  },
  soe: {
    type: "boolean",
    alias: "s",
    desc: "Stop on errors",
    default: true
  },
  quiet: {
    type: "boolean",
    alias: "q",
    desc: "Do not output any logs",
    default: false
  }
};

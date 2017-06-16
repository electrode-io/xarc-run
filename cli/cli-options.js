"use strict";

const chalk = require("chalk");

module.exports = {
  help: {
    type: "boolean",
    alias: "h",
    desc: "Show Options or help for tasks"
  },
  nmbin: {
    type: "boolean",
    alias: ["nb"],
    desc: `add ${chalk.magenta("CWD/node_modules/.bin")} to PATH`,
    default: true
  },
  npm: {
    type: "boolean",
    alias: "n",
    desc: `load npm scripts into namespace npm`,
    default: true
  },
  dir: {
    type: "string",
    alias: "d",
    desc: `Set dir to look for clap.js`,
    default: process.cwd()
  }
};

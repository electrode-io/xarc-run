"use strict";

const chalk = require("chalk");
const t1 = chalk.cyan("task1");
const t2 = chalk.cyan("task2");
const o = chalk.gray("[task options]");
const usage = "clap " + chalk.blue("[options] [--]") + ` [${t1} ${o} ${t2} ${o} ...]`;
module.exports = usage;

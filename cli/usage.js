const chalk = require("chalk");
const usage =
  "\n" +
  chalk.bold("Usage:") +
  " clap " +
  chalk.blue("[flags] [--]") +
  chalk.green(" [task [task options] task [task options] ...]");
module.exports = usage;

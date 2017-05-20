"use strict";

const chalk = require("chalk");

module.exports = {
  log: (msg) => {
    const d = new Date();
    const ts = `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]`
    console.log(`${chalk.green(ts)} ${msg}`);
  }
}

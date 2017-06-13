"use strict";

const chalk = require("chalk");
const MSEC_IN_SECOND = 1000;
const MSEC_IN_MINUTE = 60 * MSEC_IN_SECOND;

const pad2 = x => {
  return (x < 10 ? "0" : "") + x;
};

const timestamp = () => {
  const d = new Date();
  const ts = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return ts;
};

module.exports = {
  pad2,
  timestamp,
  formatElapse: elapse => {
    if (elapse >= MSEC_IN_MINUTE) {
      const min = elapse / MSEC_IN_MINUTE;
      return `${min.toFixed(2)} min`;
    } else if (elapse >= MSEC_IN_SECOND) {
      const sec = elapse / MSEC_IN_SECOND;
      return `${sec.toFixed(2)} sec`;
    } else {
      return `${elapse} ms`;
    }
  },
  log: msg => {
    process.stdout.write(
      `${chalk.magenta("[")}${chalk.gray(timestamp())}${chalk.magenta("]")} ${msg}\n`
    );
  }
};

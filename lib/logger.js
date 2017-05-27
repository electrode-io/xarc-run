"use strict";

const chalk = require("chalk");

const pad2 = x => {
  return (x < 10 ? "0" : "") + x;
};

const timestamp = () => {
  const d = new Date();
  const ts = `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  return ts;
};

module.exports = {
  pad2,
  timestamp,
  log: msg => {
    process.stdout.write(`${chalk.gray(timestamp())} ${msg}\n`);
  }
};

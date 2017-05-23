"use strict";

const chalk = require("chalk");

const pad2 = (x) => {
  return (x < 10 ? "0" : "") + x;
}

module.exports = {
  pad2,
  log: msg => {
    const d = new Date();
    const ts = `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
    console.log(`${chalk.gray(ts)} ${msg}`);
  }
};

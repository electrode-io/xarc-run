"use strict";

const chalk = require("chalk");
const MSEC_IN_SECOND = 1000;
const MSEC_IN_MINUTE = 60 * MSEC_IN_SECOND;

const pad2 = x => {
  return (x < 10 ? "0" : "") + x;
};

class Logger {
  constructor() {
    this.coloring(true);
    this.buffering(true);
    this.quiet(true);
  }

  quiet(q) {
    this._quiet = q;
  }

  buffering(f) {
    if (f) {
      if (!this._buf) this._buf = [];
    } else {
      this._buf = undefined;
    }
  }

  resetBuffer(flush, buffering) {
    if (this._buf) {
      if (flush && !this._quiet) {
        this._buf.forEach(l => this.write(`${l}\n`));
      }
      this.buffering(buffering);
    }
  }

  coloring(f) {
    if (f) {
      this._L = `${chalk.magenta("[")}`;
      this._R = `${chalk.magenta("]")}`;
      this._c = true;
    } else {
      this._L = `[`;
      this._R = `]`;
      this._c = false;
    }
  }

  get buffer() {
    return this._buf || [];
  }

  timestamp() {
    const d = new Date();
    const ts = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    return ts;
  }

  _ts() {
    return this._c
      ? `${this._L}${chalk.gray(this.timestamp())}${this._R}`
      : `${this._L}${this.timestamp()}${this._R}`;
  }

  formatElapse(elapse) {
    if (elapse >= MSEC_IN_MINUTE) {
      const min = elapse / MSEC_IN_MINUTE;
      return `${min.toFixed(2)} min`;
    } else if (elapse >= MSEC_IN_SECOND) {
      const sec = elapse / MSEC_IN_SECOND;
      return `${sec.toFixed(2)} sec`;
    } else {
      return `${elapse} ms`;
    }
  }

  log() {
    let output;

    const make = () => {
      if (output) return output;
      const msg = Array.prototype.join.call(arguments, " ");
      output = `${this._ts()} ${msg}`;
      return output;
    };

    if (this._buf) {
      this._buf.push(make());
    }

    if (!this._quiet) {
      this.write(`${make()}\n`);
    }
  }

  error(...args) {
    const x = this._quiet;
    this._quiet = false;
    this.log(...args);
    this.quiet(x);
  }

  write(output) {
    process.stdout.write(output);
  }
}

const logger = new Logger();
logger.pad2 = pad2;

module.exports = logger;

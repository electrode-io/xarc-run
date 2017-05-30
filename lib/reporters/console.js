"use strict";

const chalk = require("chalk");
const logger = require("../logger");
const stringify = require("../stringify");
const assert = require("assert");

class XReporterConsole {
  constructor(clap) {
    this._clap = clap;
    clap.on("execute", (data) => this._onExecute(data));
    clap.on("done-item", (data) => this._onDoneItem(data));
    clap.on("run", () => (this._sep = ""));
    this._tags = {};
    this._logger = logger;
  }

  _log(qItem, msg) {
    this._logger.log(`${this._indent(qItem)}${msg}`);
    this._tags[qItem.id] = { sep: this._sep, msg };
  }

  _indent(qItem, sep) {
    if (sep === undefined) {
      this._sep = this._sep === "." ? "-" : ".";
      sep = this._sep;
    }
    if (qItem.level) {
      return chalk.magenta(new Array(qItem.level + 1).join(sep));
    } else {
      return "";
    }
  }

  _onExecute(data) {
    const m = `_onExeType_${data.type.replace(/-/g, "_")}`;
    this[m](data);
  }

  _depMsg(qItem) {
    const depDee = qItem.value().depDee;
    const dep = depDee ? "'s dependency" : "";
    return dep;
  }

  _onExeType_shell(data) {
    const qItem = data.qItem;
    const regex = new RegExp(process.cwd(), "g");
    const cmd = data.cmd.replace(regex, "~");
    const msg = data.anon
      ? `Execute ${chalk.cyan(cmd)}`
      : `Execute ${chalk.cyan(qItem.name)}${this._depMsg(qItem)} ${chalk.blue(cmd)}`;
    this._log(qItem, msg);
  }

  _onExeType_lookup(data) {
    // do nothing
  }

  _onExeType_serial_arr(data) {
    const qItem = data.qItem;
    const ts = chalk.blue(stringify(data.array));
    const msg = `Process ${chalk.cyan(qItem.name)}${this._depMsg(qItem)} serial array ${ts}`;
    this._log(qItem, msg);
  }

  _onExeType_concurrent_arr(data) {
    const qItem = data.qItem;
    const ts = chalk.blue(stringify(data.array));
    const msg = `Process ${chalk.cyan(qItem.name)}${this._depMsg(qItem)} concurrent array ${ts}`;
    this._log(qItem, msg);
  }

  _onExeType_function(data) {
    const qItem = data.qItem;
    const name = `${chalk.cyan(qItem.name)}`;
    const anon = qItem.anon ? " anonymous " : " as ";
    const msg = `Execute ${name}${this._depMsg(qItem)}${anon}function`;
    this._log(qItem, msg);
  }

  _onDoneItem(data) {
    const qItem = data.qItem;
    const xqItem = data.xqItem;
    const msec = `(${data.elapse} ms)`;
    const failed = !!this._clap.failed || !!xqItem.err;
    const result = xqItem.err ? "Failed" : "Done";
    const status = failed ? chalk.red(result) : chalk.green(result);
    const tag = this._tags[xqItem.id];
    assert(tag, `console reporter no tag found for ${xqItem.name}`);

    this._logger.log(`${this._indent(xqItem, ">")}${status} ${tag.msg} ${chalk.magenta(msec)}`);
  }
}

module.exports = XReporterConsole;

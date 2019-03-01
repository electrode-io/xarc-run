"use strict";

const { mkCmd } = require("xsh");

class XTaskSpec {
  constructor(spec) {
    this.type = spec.type || "exec";
    const cmd = spec.cmd || spec.command;
    if (Array.isArray(cmd)) {
      this.cmd = mkCmd(...cmd);
    } else {
      this.cmd = cmd;
    }
    this.flags = spec.flags || {};
    this.options = spec.options;
  }

  toString() {
    if (this.type === "exec") {
      let flags = this.flags;

      if (Array.isArray(flags)) {
        flags = flags.join(",");
      } else if (typeof flags === "object") {
        flags = Object.keys(flags).join(",");
      }

      if (flags) {
        flags = `(${flags})`;
      }

      return `exec${flags} '${this.cmd}'`;
    }

    return `XTaskSpec - Unknown type ${this.type}`;
  }
}

module.exports = XTaskSpec;

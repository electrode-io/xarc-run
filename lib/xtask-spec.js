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

    // gather execOptions from spec
    const execOptions = Object.assign({}, spec.execOptions);
    const env = Object.assign({}, execOptions.env, spec.env);
    if (Object.keys(env).length) {
      execOptions.env = env;
    }
    this.options = execOptions;
    //
    this.flags = spec.flags || {};
    this.xclap = Object.assign({ delayRunMs: 0 }, spec.xclap);
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

      let envStr = "";
      const env = this.options.env;
      if (env) {
        envStr = ` {${Object.keys(env)
          .map(k => `${k}=${env[k]}`)
          .join(";")}}`;
      }

      return `exec${flags}${envStr} '${this.cmd}'`;
    }

    return `XTaskSpec - Unknown type ${this.type}`;
  }
}

module.exports = XTaskSpec;

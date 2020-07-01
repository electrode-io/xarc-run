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
    if (this.type === "env") {
      this.options.override = spec.override;
    }
    //
    this.flags = spec.flags || {};
    this.xrun = Object.assign({ delayRunMs: 0 }, spec.xrun || spec.xclap);
  }

  toString() {
    const makeEnvStr = s => {
      let envStr = "";
      const env = this.options.env;
      if (env) {
        envStr = `${s}{${Object.keys(env)
          .map(k => `${k}=${env[k]}`)
          .join(";")}}`;
      }
      return envStr;
    };
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

      return `exec${flags}${makeEnvStr(" ")} '${this.cmd}'`;
    } else if (this.type === "env") {
      return `env${makeEnvStr("")}`;
    }

    return `XTaskSpec - Unknown type ${this.type}`;
  }
}

module.exports = XTaskSpec;

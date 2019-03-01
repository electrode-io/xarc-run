"use strict";

const XClap = require("./xclap");
const xclap = new XClap({});
const XReporterConsole = require("../lib/reporters/console");
const reporter = new XReporterConsole(xclap);
const XTaskSpec = require("./xtask-spec");

xclap.XClap = XClap;
module.exports = xclap;

xclap.XTaskSpec = XTaskSpec;

xclap.exec = (spec, flags, options) => {
  if (Array.isArray(spec) || typeof spec === "string") {
    return new XTaskSpec({
      cmd: spec,
      flags,
      options
    });
  } else if (typeof spec === "object") {
    return new XTaskSpec(spec);
  } else {
    throw new Error(
      `xclap.exec - unknown spec type ${typeof spec}: must be a string, array, or an object`
    );
  }
};

"use strict";

const XClap = require("./xclap");
const xclap = new XClap({});
const XReporterConsole = require("../lib/reporters/console");
const reporter = new XReporterConsole(xclap);
const XTaskSpec = require("./xtask-spec");

xclap.XClap = XClap;
module.exports = xclap;

xclap.XTaskSpec = XTaskSpec;

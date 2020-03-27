"use strict";

const XClap = require("./xclap");
const XReporterConsole = require("../lib/reporters/console");
const XTaskSpec = require("./xtask-spec");

const xclap = new XClap({});
xclap[Symbol("reporter")] = new XReporterConsole(xclap);

xclap.load = xclap.load.bind(xclap);
xclap.XClap = XClap;
xclap.XTaskSpec = XTaskSpec;
xclap.XReporterConsole = XReporterConsole;

module.exports = xclap;

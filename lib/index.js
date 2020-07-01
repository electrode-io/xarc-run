"use strict";

const XRun = require("./xrun");
const XReporterConsole = require("../lib/reporters/console");
const XTaskSpec = require("./xtask-spec");

const xrun = new XRun({});
xrun[Symbol("reporter")] = new XReporterConsole(xrun);

xrun.load = xrun.load.bind(xrun);
xrun.run = xrun.run.bind(xrun);
xrun.asyncRun = xrun.asyncRun.bind(xrun);

xrun.XClap = XRun;
xrun.XRun = XRun;
xrun.XTaskSpec = XTaskSpec;
xrun.XReporterConsole = XReporterConsole;

module.exports = xrun;

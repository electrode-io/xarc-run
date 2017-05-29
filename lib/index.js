"use strict";

const XClap = require("./xclap");
const xclap = new XClap({});
const XReporterConsole = require("../lib/reporters/console");
const reporter = new XReporterConsole(xclap);

xclap.XClap = XClap;
module.exports = xclap;

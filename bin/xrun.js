#!/usr/bin/env node
const checkGlobal = require("../cli/check-global");
const Path = require("path");
const xrun = require(Path.join(__dirname, "../cli/xrun"));

if (checkGlobal()) {
  setTimeout(() => xrun(), 2000);
} else {
  xrun();
}

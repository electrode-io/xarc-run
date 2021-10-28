"use strict";

const assert = require("assert");

const lib = {
  container: process.env,
  xrunTaskFile: "XRUN_TASKFILE",
  xrunPackagePath: "XRUN_PACKAGE_PATH",
  xrunId: "XRUN_ID",
  forceColor: "FORCE_COLOR",
  xrunCwd: "XRUN_CWD",
  xrunVersion: "XRUN_VERSION",
  xrunBinDir: "XRUN_BIN_DIR",
  xrunNodeBin: "XRUN_NODE_BIN",
  get(key) {
    assert(key, `env.get invalid key: ${key}`);
    return lib.container[key];
  },
  set(key, val) {
    assert(key, `env.set invalid key: ${key}`);
    lib.container[key] = `${val}`;
  },
  has(key) {
    assert(key, `env.has invalid key: ${key}`);
    return lib.container.hasOwnProperty(key);
  },
  del(key) {
    assert(key, `env.del invalid key: ${key}`);
    delete lib.container[key];
  }
};

module.exports = lib;

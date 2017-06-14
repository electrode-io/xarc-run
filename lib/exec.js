"use strict";

const shell = require("shcmd");

module.exports = function(cmd, silent, cb) {
  if (typeof silent === "function") {
    cb = silent;
    silent = true;
  } else {
    silent = !!silent;
  }
  shell.exec(cmd, { async: true, silent }, (code, stdout, stderr) => {
    const output = { stdout, stderr };
    if (code !== 0) {
      const err = new Error(`${cmd} return code ${code}`);
      err.output = output;
      err.code = code;
      return cb(err);
    }

    return cb(null, output);
  });
};

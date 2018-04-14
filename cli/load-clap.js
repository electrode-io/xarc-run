"use strict";

const Path = require("path");
const Fs = require("fs");
const optionalRequire = require("optional-require")(require);

/*
 * Look for clap file at clapDir
 * Search up each directory if `search` is true
 * Until a file "package.json" is found or top is reached
 */

function loadClap(clapDir, search) {
  let result;

  let dir = clapDir;
  do {
    result = findClapFile(dir);
    if (result.found || result.foundPkg) {
      break;
    }
    const tmp = Path.join(dir, "..");
    if (!tmp || tmp === "." || tmp === dir) {
      break;
    }
    dir = tmp;
  } while (search);

  if (!result.found) result.dir = clapDir;

  return result;
}

module.exports = loadClap;

function findClapFile(clapDir) {
  let found = false;
  let foundPkg = false;
  let clapFile;
  let clapTasks;

  const file = ["xclap.js", "clapfile.js", "clap.js", "gulpfile.js"].find(f => {
    clapFile = Path.join(clapDir, f);
    found = Fs.existsSync(clapFile);
    return found;
  });

  if (!found) {
    const pkgJson = Path.join(clapDir, "package.json");
    if (Fs.existsSync(pkgJson)) {
      foundPkg = true;
    }
  }

  return {
    found,
    foundPkg,
    clapFile,
    dir: clapDir
  };
}

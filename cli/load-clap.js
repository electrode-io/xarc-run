"use strict";

const Path = require("path");
const Fs = require("fs");

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
  const dirFiles = Fs.readdirSync(clapDir);
  const files = ["xclap.", "clapfile.", "clap.", "gulpfile."];

  const clapFile = dirFiles.find(f => {
    return files.find(n => f.startsWith(n));
  });

  const foundPkg = Boolean(dirFiles.find(f => f === "package.json"));

  return {
    found: Boolean(clapFile),
    foundPkg,
    clapFile: clapFile ? Path.join(clapDir, clapFile) : undefined,
    dir: clapDir
  };
}

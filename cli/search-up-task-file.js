"use strict";

const Path = require("path");
const Fs = require("fs");
const config = require("./config");

/*
 * Look for xrun file at xrunDir
 * Search up each directory if `search` is true
 * Until a file "package.json" is found or top is reached
 */

function searchUpTaskFile(xrunDir, search) {
  let result;

  let dir = xrunDir;
  do {
    result = findTaskFile(dir);
    if (result.found || result.foundPkg) {
      break;
    }
    const tmp = Path.join(dir, "..");
    if (!tmp || tmp === "." || tmp === dir) {
      break;
    }
    dir = tmp;
  } while (search);

  if (!result.found) result.dir = xrunDir;

  return result;
}

module.exports = searchUpTaskFile;

function findTaskFile(xrunDir) {
  const dirFiles = Fs.readdirSync(xrunDir);
  const files = config.search;

  let xrunFile;
  files.find(n => (xrunFile = dirFiles.find(f => f.startsWith(n))));

  const foundPkg = Boolean(dirFiles.find(f => f === "package.json"));

  return {
    found: Boolean(xrunFile),
    foundPkg,
    xrunFile: xrunFile ? Path.join(xrunDir, xrunFile) : undefined,
    dir: xrunDir
  };
}

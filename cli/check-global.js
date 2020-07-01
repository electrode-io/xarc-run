"use strict";

const Path = require("path");
const pathIsInside = require("path-is-inside");
const chalk = require("chalk");
const cwd = process.cwd();
const execPath = process.execPath;

const myPkg = require("../package.json");

function warnGlobal() {
  console.log(
    chalk.red(`It appears that you've installed ${myPkg.name} globally.  Please don't do that.`)
  );
  console.log(chalk.green(`Please install only ${chalk.magenta(`${myPkg.name}-cli`)} globally.`));
  return true;
}

function checkGlobal() {
  if (
    pathIsInside(__dirname, execPath) ||
    pathIsInside(__dirname, Path.join(execPath, "..")) ||
    pathIsInside(__dirname, Path.join(execPath, "../.."))
  ) {
    return warnGlobal();
  } else if (!pathIsInside(__dirname, cwd)) {
    const dir = Path.dirname(__dirname);
    // On windows, global modules are installed to AppData\Roaming\npm\node_modules
    if (
      (process.platform === "win32" &&
        __dirname.indexOf("AppData\\Roaming\\npm\\node_modules") >= 0) ||
      dir.endsWith(`/lib/node_modules/xclap`) ||
      dir.endsWith(`/lib/node_modules/${myPkg.name}`)
    ) {
      return warnGlobal();
    }
  }

  return false;
}

module.exports = checkGlobal;

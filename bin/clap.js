#!/usr/bin/env node
const Path = require("path");
const pathIsInside = require("path-is-inside");
const chalk = require("chalk");
const cwd = process.cwd();
const execPath = process.execPath;
const clap = require(Path.join(__dirname, "../cli/clap"));

function warnGlobal() {
  console.log(chalk.red("It appears that you've installed xclap globally.  Please don't do that."));
  console.log(chalk.green(`Please install only ${chalk.magenta("xclap-cli")} globally.`));
  return true;
}

function warn() {
  if (
    pathIsInside(__dirname, execPath) ||
    pathIsInside(__dirname, Path.join(execPath, "..")) ||
    pathIsInside(__dirname, Path.join(execPath, "../.."))
  ) {
    return warnGlobal();
  } else if (!pathIsInside(__dirname, cwd)) {
    // On windows, global modules are installed to AppData\Roaming\npm\node_modules
    if (
      (process.platform === "win32" &&
        __dirname.indexOf("AppData\\Roaming\\npm\\node_modules") >= 0) ||
      Path.dirname(__dirname).endsWith("/lib/node_modules/xclap")
    ) {
      return warnGlobal();
    }
  }

  return false;
}

if (warn()) {
  setTimeout(() => clap(), 2000);
} else {
  clap();
}

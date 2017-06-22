"use strict";

const Path = require("path");
const optionalRequire = require("optional-require")(require);
const logger = require("../lib/logger");
const chalk = require("chalk");

module.exports = (xclap, options) => {
  const Pkg = optionalRequire(Path.join(options.cwd, "package.json"));

  if (!Pkg) {
    return;
  }

  const pkgName = chalk.magenta("CWD/package.json");

  if (Pkg.scripts && options.npm !== false) {
    xclap.load("npm", Pkg.scripts);
    logger.log(`Loaded npm scripts from ${pkgName} into namespace ${chalk.magenta("npm")}`);
  }

  if (Pkg.xclap) {
    const tasks = Object.assign({}, Pkg.xclap.tasks);
    if (Object.keys(tasks).length > 0) {
      xclap.load("pkg", tasks);
      logger.log(`Loaded xclap tasks from ${pkgName} into namespace ${chalk.magenta("pkg")}`);
    }
  }
};

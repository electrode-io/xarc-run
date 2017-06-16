"use strict";

const Path = require("path");
const optionalRequire = require("optional-require")(require);
const Pkg = optionalRequire(Path.resolve("package.json"));
const logger = require("../lib/logger");
const chalk = require("chalk");

module.exports = xclap => {
  if (!Pkg) {
    return;
  }
  const pkgName = chalk.magenta("CWD/package.json");
  if (Pkg.scripts) {
    xclap.load("npm", Pkg.scripts);
    logger.log(`Loaded npm scripts from ${pkgName} into namespace ${chalk.magenta("npm")}`);
  }

  if (Pkg.xclap) {
    const tasks = Object.assign({}, Pkg.xclap);
    delete tasks.__config;
    if (Object.keys(tasks).length > 0) {
      xclap.load("pkg", tasks);
      logger.log(`Loaded xclap tasks from ${pkgName} into namespace ${chalk.magenta("pkg")}`);
    }
    if (Pkg.xclap.__config) {
      logger.log(`Applying ${chalk.green("__config")} settings from ${pkgName}`);
    }
  }
};

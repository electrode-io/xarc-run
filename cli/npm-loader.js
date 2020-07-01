"use strict";

const logger = require("../lib/logger");
const chalk = require("chalk");
const readPkgUp = require("read-pkg-up");
const myPkg = require("../package.json");
const config = require("./config");

module.exports = (xrun, options) => {
  const readPkg = readPkgUp.sync();

  if (!readPkg) {
    return;
  }

  const Pkg = readPkg.packageJson;

  const pkgName = chalk.magenta(readPkg.path.replace(process.cwd(), "CWD"));

  if (Pkg.scripts && options.npm !== false) {
    const scripts = {};
    for (const k in Pkg.scripts) {
      if (!k.startsWith("pre") && !k.startsWith("post")) {
        const pre = `pre${k}`;
        const post = `post${k}`;
        scripts[k] = xrun.serial(
          Pkg.scripts.hasOwnProperty(pre) && pre,
          xrun.exec(Pkg.scripts[k], "npm"),
          Pkg.scripts.hasOwnProperty(post) && post
        );
      } else {
        scripts[k] = xrun.exec(Pkg.scripts[k], "npm");
      }
    }
    xrun.load("npm", scripts);
    logger.log(`Loaded npm scripts from ${pkgName} into namespace ${chalk.magenta("npm")}`);
  }

  const pkgConfig = config.getPkgOpt(Pkg);

  if (pkgConfig) {
    const tasks = Object.assign({}, pkgConfig.tasks);
    if (Object.keys(tasks).length > 0) {
      xrun.load("pkg", tasks);
      logger.log(
        `Loaded ${myPkg.name} tasks from ${pkgName} into namespace ${chalk.magenta("pkg")}`
      );
    }
  }
};

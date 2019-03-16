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
    const scripts = {};
    for (const k in Pkg.scripts) {
      if (!k.startsWith("pre") && !k.startsWith("post")) {
        const pre = `pre${k}`;
        const post = `post${k}`;
        scripts[k] = xclap.serial(
          Pkg.scripts.hasOwnProperty(pre) && pre,
          xclap.exec(Pkg.scripts[k], "npm"),
          Pkg.scripts.hasOwnProperty(post) && post
        );
      } else {
        scripts[k] = xclap.exec(Pkg.scripts[k], "npm");
      }
    }
    xclap.load("npm", scripts);
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

"use strict";

const optionalRequire = require("optional-require")(require);
const Path = require("path");
const nixClap = require("./nix-clap");
const xclap = require("..");
const chalk = require("chalk");
const logger = require("../lib/logger");
const usage = require("./usage");
const envPath = require("xsh").envPath;
const Fs = require("fs");
const npmLoader = require("./npm-loader");
const xsh = require("xsh");

function clap(argv, offset) {
  if (!argv) {
    argv = process.argv;
    offset = 2;
  }

  const claps = nixClap(argv, offset);

  npmLoader(xclap, claps.opts);

  const clapDir = Path.resolve(claps.opts.dir || "");

  let notFound;
  let clapFile;
  let clapTasks;
  const file = ["clap.js", "xclap.js", "gulpfile.js"].find(f => {
    notFound = false;
    clapFile = Path.join(clapDir, f);
    clapTasks = optionalRequire(clapFile, { notFound: () => (notFound = true) });
    return !notFound;
  });

  if (notFound) {
    const x = chalk.magenta(xsh.pathCwd.replace(clapDir));
    logger.log(`No ${chalk.green("clap.js")} found in ${x}`);
  } else {
    const loaded = chalk.green(`${xsh.pathCwd.replace(clapFile)}`);
    if (typeof clapTasks === "function") {
      clapTasks(xclap);
      logger.log(`Called export function from ${loaded}`);
    } else if (typeof clapTasks === "object") {
      if (Object.keys(clapTasks).length > 0) {
        xclap.load("clap", clapTasks);
        logger.log(`Loaded tasks from ${loaded} into namespace ${chalk.magenta("clap")}`);
      } else {
        logger.log(`Loaded ${loaded}`);
      }
    } else {
      logger.log(`Unknown export type ${chalk.yellow(typeof clapTasks)} from ${loaded}`);
    }
  }

  const numTasks = xclap.countTasks();

  if (numTasks === 0) {
    logger.log(chalk.red("No tasks found - please load some."));
  } else if (claps.opts.list !== undefined) {
    const ns = claps.opts.list && claps.opts.list.split(",").map(x => x.trim());
    if (claps.opts.full) {
      console.log(xclap._tasks.fullNames(ns).join("\n"));
    } else {
      console.log(xclap._tasks.names(ns).join("\n"));
    }
    return process.exit(0);
  } else if (claps.opts.ns) {
    console.log(xclap._tasks._namespaces.join("\n"));
    return process.exit(0);
  }

  if (claps.tasks.length === 0 || numTasks === 0) {
    xclap.printTasks();
    console.log(`${usage}`);
    console.log(chalk.bold(" Help:"), "clap -h", chalk.bold(" Example:"), "clap build\n");
    return process.exit(1);
  }

  if (claps.opts.help) {
    console.log("help for tasks:", claps.tasks);
    return process.exit(0);
  }

  if (claps.opts.nmbin) {
    const nmBin = Path.resolve("node_modules", ".bin");
    if (Fs.existsSync(nmBin)) {
      const x = chalk.magenta(`${xsh.pathCwdNm.replace(nmBin)}`);
      envPath.addToFront(nmBin);
      logger.log(`Added ${x} to PATH`);
    }
  }

  process.env.FORCE_COLOR = "true";

  xclap.stopOnError = claps.opts.soe;

  return xclap.run(claps.tasks.length === 1 ? claps.tasks[0] : claps.tasks);
}

module.exports = clap;

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
const cliOptions = require("./cli-options");
const parseArray = require("../lib/util/parse-array");

function clap(argv, offset) {
  if (!argv) {
    argv = process.argv;
    offset = 2;
  }

  if (argv.length === 3 && argv[offset] === "--options") {
    Object.keys(cliOptions).forEach(k => {
      const x = cliOptions[k];
      console.log(`--${k}`);
      console.log(`-${x.alias}`);
    });
    return process.exit(0);
  }

  const claps = nixClap(argv, offset);
  const opts = claps.opts;

  npmLoader(xclap, opts);

  const clapDir = Path.join(opts.cwd, opts.dir || "");

  let notFound;
  let clapFile;
  let clapTasks;
  const file = ["xclap.js", "clapfile.js", "clap.js", "gulpfile.js"].find(f => {
    notFound = false;
    clapFile = Path.join(clapDir, f);
    clapTasks = optionalRequire(clapFile, { notFound: () => (notFound = true) });
    return !notFound;
  });

  if (notFound) {
    const x = chalk.magenta(xsh.pathCwd.replace(clapDir));
    logger.log(`No ${chalk.green("xclap.js")} found in ${x}`);
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
  } else if (opts.list !== undefined) {
    const ns = opts.list && opts.list.split(",").map(x => x.trim());
    try {
      if (opts.full) {
        let fn = xclap._tasks.fullNames(ns);
        if (opts.full > 1) fn = fn.map(x => (x.startsWith("/") ? x : `/${x}`));
        console.log(fn.join("\n"));
      } else {
        console.log(xclap._tasks.names(ns).join("\n"));
      }
    } catch (err) {
      console.log(err.message);
    }
    return process.exit(0);
  } else if (opts.ns) {
    console.log(xclap._tasks._namespaces.join("\n"));
    return process.exit(0);
  }

  if (claps.tasks.length === 0 || numTasks === 0) {
    xclap.printTasks();
    if (!opts.quiet) {
      console.log(`${usage}`);
      console.log(chalk.bold(" Help:"), "clap -h", chalk.bold(" Example:"), "clap build\n");
    }
    return process.exit(1);
  }

  if (opts.help) {
    console.log("help for tasks:", claps.tasks);
    return process.exit(0);
  }

  if (opts.nmbin) {
    const nmBin = Path.join(opts.cwd, "node_modules", ".bin");
    if (Fs.existsSync(nmBin)) {
      const x = chalk.magenta(`${xsh.pathCwdNm.replace(nmBin)}`);
      envPath.addToFront(nmBin);
      logger.log(`Added ${x} to PATH`);
    }
  }

  process.env.FORCE_COLOR = "true";

  xclap.stopOnError = opts.soe;

  let tasks = claps.tasks.map(x => {
    if (x.startsWith("/") && x.indexOf("/", 1) > 1) {
      return x.substr(1);
    }
    return x;
  });

  if (tasks[0].startsWith("[")) {
    let arrayStr;
    try {
      arrayStr = tasks.join(" ");
      tasks = parseArray(arrayStr);
    } catch (e) {
      console.log(
        "Parsing array of tasks failed:",
        chalk.red(`${e.message}:`),
        chalk.cyan(arrayStr)
      );
      return process.exit(1);
    }
  }

  if (tasks.length > 1 && tasks[0] !== "." && opts.serial) {
    tasks = ["."].concat(tasks);
  }

  return xclap.run(tasks.length === 1 ? tasks[0] : tasks);
}

module.exports = clap;

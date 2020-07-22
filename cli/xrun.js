"use strict";

const Path = require("path");
const parseCmdArgs = require("./parse-cmd-args");
const runner = require("..");
const chalk = require("chalk");
const logger = require("../lib/logger");
const usage = require("./usage");
const envPath = require("xsh").envPath;
const Fs = require("fs");
const xsh = require("xsh");
const cliOptions = require("./cli-options");
const parseArray = require("../lib/util/parse-array");

function flushLogger(opts) {
  logger.quiet(opts && opts.quiet);
  logger.resetBuffer(true, false);
}

function exit(code) {
  process.exit(code);
}

function xrun(argv, offset, clapMode = false) {
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
    return exit(0);
  }

  const cmdArgs = parseCmdArgs(argv, offset, clapMode);
  const opts = cmdArgs.opts;

  const numTasks = runner.countTasks();

  if (numTasks === 0) {
    logger.log(chalk.red("No tasks found - please load some."));
  } else if (cmdArgs.parsed.source.list !== "default") {
    flushLogger(opts);
    const ns = opts.list && opts.list.split(",").map(x => x.trim());
    try {
      if (opts.full) {
        let fn = runner._tasks.fullNames(ns);
        if (opts.full > 1) fn = fn.map(x => (x.startsWith("/") ? x : `/${x}`));
        console.log(fn.join("\n"));
      } else {
        console.log(runner._tasks.names(ns).join("\n"));
      }
    } catch (err) {
      console.log(err.message);
    }
    return exit(0);
  } else if (opts.ns) {
    flushLogger(opts);
    console.log(runner._tasks._namespaces.join("\n"));
    return exit(0);
  }

  const cmdName = Path.basename(process.argv[1] || "") || "xrun";

  if (cmdArgs.tasks.length === 0 || numTasks === 0) {
    flushLogger(opts);
    runner.printTasks();
    if (!opts.quiet) {
      console.log(`${usage}`);
      console.log(
        chalk.bold(" Help:"),
        `${cmdName} -h`,
        chalk.bold(" Example:"),
        `${cmdName} build\n`
      );
    }
    return exit(1);
  }

  if (opts.help) {
    console.log("help for tasks:", cmdArgs.tasks);
    return exit(0);
  }

  flushLogger(opts);

  if (opts.nmbin) {
    const nmBin = Path.join(opts.cwd, "node_modules", ".bin");
    if (Fs.existsSync(nmBin)) {
      const x = chalk.magenta(`${xsh.pathCwd.replace(nmBin, ".")}`);
      if (!process.env.PATH.match(new RegExp(`${nmBin}(${Path.delimiter}|$)`))) {
        envPath.addToFront(nmBin);
        logger.log(`Added ${x} to PATH`);
      } else {
        logger.log(`PATH already contains ${x}`);
      }
    }
  }

  if (!process.env.hasOwnProperty("FORCE_COLOR")) {
    process.env.FORCE_COLOR = "1";
  }

  if (runner.stopOnError === undefined || cmdArgs.parsed.source.soe !== "default") {
    runner.stopOnError = opts.soe;
  }

  let tasks = cmdArgs.tasks.map(x => {
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
      return exit(1);
    }
  }

  if (tasks.length > 1 && tasks[0] !== "." && opts.serial) {
    tasks = ["."].concat(tasks);
  }

  return runner.run(tasks.length === 1 ? tasks[0] : tasks);
}

module.exports = xrun;

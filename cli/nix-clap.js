"use strict";

const Path = require("path");
const cliOptions = require("./cli-options");
const NixClap = require("nix-clap");
const usage = require("./usage");
const optionalRequire = require("optional-require")(require);
const logger = require("../lib/logger");
const chalk = require("chalk");
const xclapPkg = require("../package.json");
const xsh = require("xsh");

function nixClap(argv, start) {
  function getOpt(name) {
    if (cliOptions.hasOwnProperty(name)) {
      return cliOptions[name];
    }

    const k = Object.keys(cliOptions).find(function(o) {
      return cliOptions[o].alias === name;
    });

    return cliOptions[k];
  }

  function takeNextArg(x) {
    const arg = argv[x];
    const next = (x + 1 < argv.length && argv[x + 1]) || "";

    if (arg.indexOf("=") > 0 || next.startsWith("-")) {
      return false;
    }

    let opt;
    if (!arg.startsWith("--")) {
      opt = getOpt(arg.substr(arg.length - 1));
    } else if (arg.startsWith("--no-")) {
      return false;
    } else {
      opt = getOpt(arg.substr(2));
    }

    return opt && !(opt.type === "boolean" || opt.type === "count" || opt.count !== undefined);
  }

  function findCutOff() {
    let i = start;
    for (; i < argv.length && argv[i] !== "--"; i++) {
      if (!argv[i].startsWith("-")) {
        return i;
      }

      if (takeNextArg(i)) {
        i++;
      }
    }

    return i;
  }

  const cutOff = findCutOff();
  const cliArgs = argv.slice(start, cutOff);
  const taskArgs = argv.slice(cutOff);
  const extractTask = (startIx, endIx) => taskArgs.slice(startIx, endIx).join(" ");

  const taskXt = taskArgs.reduce(
    (acc, v, ix) => {
      if (!v.startsWith("-")) {
        if (ix > 0) acc.tasks.push(extractTask(acc.k, ix));
        acc.k = ix;
      }
      return acc;
    },
    { tasks: [], k: 0 }
  );

  const tasks = taskXt.tasks;
  if (taskArgs.length > 0) tasks.push(extractTask(taskXt.k, taskArgs.length));

  const nc = new NixClap({
    name: xclapPkg.name,
    version: xclapPkg.version,
    usage,
    handlers: {
      "unknown-command": false,
      help: p => {
        if (tasks.length > 0) {
          p.opts.help = true;
        } else {
          nc.showHelp(null, p.opts.help);
        }
      }
    }
  }).init(cliOptions);

  const parsed = nc.parse(cliArgs);

  const opts = parsed.opts;

  logger.quiet(opts.quiet);
  const xclapLoc = xsh.pathCwd.replace(Path.dirname(__dirname));

  logger.log(`${chalk.green("xclap")} version ${xclapPkg.version} at ${chalk.magenta(xclapLoc)}`);
  logger.log(
    `${chalk.green("NodeJS")} version ${process.version} at ${chalk.magenta(process.execPath)}`
  );

  let cwd = process.cwd();
  if (opts.cwd) {
    const newCwd = Path.join(cwd, opts.cwd);
    try {
      process.chdir(newCwd);
      logger.log(`CWD changed to ${chalk.magenta(newCwd)}`);
      cwd = newCwd;
    } catch (err) {
      logger.log(`chdir ${chalk.magenta(newCwd)} ${chalk.red("failed")}`);
    }
  } else {
    logger.log(`CWD is ${chalk.magenta(cwd)}`);
  }

  opts.cwd = cwd;

  const Pkg = optionalRequire(Path.join(cwd, "package.json"));

  if (Pkg && Pkg.xclap) {
    const pkgConfig = Object.assign({}, Pkg.xclap);
    delete pkgConfig.cwd; // not allow pkg config to override cwd
    delete pkgConfig.tasks;
    nc.applyConfig(pkgConfig, parsed);
    const pkgName = chalk.magenta("CWD/package.json");
    logger.log(`Applied ${chalk.green("xclap options")} from ${pkgName}`);
  }

  return {
    cutOff: cutOff,
    cliArgs: cliArgs,
    taskArgs: taskArgs,
    opts,
    tasks
  };
}

module.exports = nixClap;

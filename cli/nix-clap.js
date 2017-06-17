"use strict";

const Path = require("path");
const cliOptions = require("./cli-options");
const Yargs = require("yargs");
const usage = require("./usage");
const optionalRequire = require("optional-require")(require);
const logger = require("../lib/logger");
const chalk = require("chalk");
const xclapPkg = require("../package.json");

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
  const tasks = taskArgs.map(x => (x.startsWith("-") ? null : x)).filter(x => !!x);

  const parser = Yargs.usage(usage, cliOptions).strict();
  let opts = parser.parse(cliArgs);

  if (opts.version) {
    console.log(xclapPkg.version);
    return process.exit(0);
  }

  if (opts.help && tasks.length === 0) {
    parser.showHelp();
    return process.exit(0);
  }

  logger.quiet(opts.quiet);

  logger.log(`${chalk.green("xclap")} version ${xclapPkg.version}`);

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
  }

  const Pkg = optionalRequire(Path.join(cwd, "package.json"));

  if (Pkg && Pkg.xclap && Pkg.xclap.__options) {
    parser.config(Pkg.xclap.__options);
    const pkgName = chalk.magenta("CWD/package.json");
    logger.log(`Applied ${chalk.green("xclap __options")} from ${pkgName}`);
  }

  opts = parser.parse(cliArgs);
  opts.cwd = cwd;

  return {
    cutOff: cutOff,
    cliArgs: cliArgs,
    taskArgs: taskArgs,
    parser: parser,
    opts,
    tasks
  };
}

module.exports = nixClap;

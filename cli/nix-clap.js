"use strict";

const Path = require("path");
const cliOptions = require("./cli-options");
const Yargs = require("yargs");
const usage = require("./usage");
const optionalRequire = require("optional-require")(require);
const Pkg = optionalRequire(Path.resolve("package.json"));
const logger = require("../lib/logger");
const chalk = require("chalk");

function nixClap(argv, start) {
  const parser = Yargs.usage(usage, cliOptions);

  if (Pkg && Pkg.xclap && Pkg.xclap.__options) {
    const pkgName = chalk.magenta("CWD/package.json");
    logger.log(`Applying ${chalk.green("xclap __options")} from ${pkgName}`);
    parser.config(Pkg.xclap.__options);
  }

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
    for (let i = start; i < argv.length && argv[i] !== "--"; i++) {
      if (!argv[i].startsWith("-")) {
        return i;
      }

      if (takeNextArg(i)) {
        i++;
      }
    }

    return argv.length;
  }

  const cutOff = findCutOff();
  const cliArgs = argv.slice(start, cutOff);
  const taskArgs = argv.slice(cutOff);

  return {
    cutOff: cutOff,
    cliArgs: cliArgs,
    taskArgs: taskArgs,
    parser: parser,
    opts: parser.parse(cliArgs),
    tasks: taskArgs
      .map(function(x) {
        return x.startsWith("-") ? null : x;
      })
      .filter(function(x) {
        return x;
      })
  };
}

module.exports = nixClap;

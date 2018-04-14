"use strict";

const Path = require("path");
const cliOptions = require("./cli-options");
const NixClap = require("nix-clap");
const chalk = require("chalk");
const xsh = require("xsh");
const usage = require("./usage");
const optionalRequire = require("optional-require")(require);
const logger = require("../lib/logger");
const xclapPkg = require("../package.json");
const xclap = require("..");
const loadClap = require("./load-clap");
const npmLoader = require("./npm-loader");

function updateCwd(dir, opts) {
  const newCwd = Path.isAbsolute(dir) ? dir : Path.resolve(dir);

  try {
    const cwd = process.cwd();
    if (newCwd !== cwd) {
      process.chdir(newCwd);
      logger.log(`CWD changed to ${chalk.magenta(newCwd)}`);
    } else {
      logger.log(`CWD is ${chalk.magenta(cwd)}`);
    }
    opts.cwd = newCwd;
  } catch (err) {
    logger.log(`chdir ${chalk.magenta(newCwd)} ${chalk.red("failed")}`);
    process.exit(1);
  }
}

function searchClap(search, opts) {
  const clapDir = Path.join(opts.cwd, opts.dir || "");

  const loadResult = loadClap(clapDir, search);

  if (!loadResult.found) {
    const x = chalk.magenta(xsh.pathCwd.replace(clapDir));
    logger.log(`No ${chalk.green("xclap.js")} found in ${x}`);
  } else if (search) {
    // force CWD to where clap file was found
    updateCwd(loadResult.dir, opts);
  }

  return loadResult;
}

function loadTasks(opts, searchResult) {
  npmLoader(xclap, opts);
  const loadMsg = chalk.green(`${xsh.pathCwd.replace(searchResult.clapFile)}`);

  const tasks =
    searchResult.clapFile &&
    optionalRequire(searchResult.clapFile, {
      fail: e => {
        const errMsg = chalk.red(`Unable to load ${searchResult.clapFile}`);
        logger.log(`${errMsg}: ${e.stack}`);
      }
    });

  if (!tasks) return;

  if (typeof tasks === "function") {
    tasks(xclap);
    logger.log(`Called export function from ${loadMsg}`);
  } else if (typeof tasks === "object") {
    if (Object.keys(tasks).length > 0) {
      xclap.load("clap", tasks);
      logger.log(`Loaded tasks from ${loadMsg} into namespace ${chalk.magenta("clap")}`);
    } else {
      logger.log(`Loaded ${loadMsg}`);
    }
  } else {
    logger.log(`Unknown export type ${chalk.yellow(typeof tasks)} from ${loadMsg}`);
  }
}

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

  // don't search if user has explicitly set CWD
  const search = !opts.cwd;

  if (opts.cwd) {
    updateCwd(opts.cwd, opts);
  } else {
    opts.cwd = process.cwd();
  }

  const searchResult = searchClap(search, opts);

  const Pkg = optionalRequire(Path.join(opts.cwd, "package.json"));

  if (Pkg && Pkg.xclap) {
    const pkgConfig = Object.assign({}, Pkg.xclap);
    delete pkgConfig.cwd; // not allow pkg config to override cwd
    delete pkgConfig.tasks;
    nc.applyConfig(pkgConfig, parsed);
    const pkgName = chalk.magenta("CWD/package.json");
    logger.log(`Applied ${chalk.green("xclap options")} from ${pkgName}`);
  }

  loadTasks(opts, searchResult);

  return {
    cutOff: cutOff,
    cliArgs: cliArgs,
    taskArgs: taskArgs,
    opts,
    tasks,
    parsed
  };
}

module.exports = nixClap;

"use strict";

const Path = require("path");
const cliOptions = require("./cli-options");
const NixC = require("nix-clap");
const chalk = require("chalk");
const xsh = require("xsh");
const usage = require("./usage");
const optionalRequire = require("optional-require")(require);
const logger = require("../lib/logger");
const myPkg = require("../package.json");
const xrun = require("..");
const searchUpTaskFile = require("./search-up-task-file");
const npmLoader = require("./npm-loader");
const ck = require("chalker");
const requireAt = require("require-at");
const config = require("./config");

function exit(code) {
  process.exit(code);
}

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
    exit(1);
  }
}

function searchTaskFile(search, opts) {
  const xrunDir = Path.join(opts.cwd, opts.dir || "");

  const loadResult = searchUpTaskFile(xrunDir, search);

  if (!loadResult.found) {
    const x = chalk.magenta(xsh.pathCwd.replace(xrunDir));
    logger.log(`No ${chalk.green(config.taskFile)} found in ${x}`);
  } else if (search) {
    // force CWD to where xrun task file was found
    updateCwd(loadResult.dir, opts);
  }

  return loadResult;
}

function loadTaskFile(name) {
  if (Path.extname(name) === ".ts") {
    logger.log("loading ts-node/register/transpile-only");
    optionalRequire("ts-node/register/transpile-only", {
      fail: e => {
        logger.log(
          "Unable to load ts-node/register/transpile-only, TypeScript may not work.",
          e.message
        );
      }
    });
  }

  return optionalRequire(name, {
    fail: e => {
      const errMsg = chalk.red(`Unable to load ${xsh.pathCwd.replace(name, ".")}`);
      logger.error(`${errMsg}: ${xsh.pathCwd.replace(e.stack, ".", "g")}`);
    }
  });
}

function processTasks(tasks, loadMsg, ns = "xrun") {
  if (typeof tasks === "function") {
    tasks(xrun);
    logger.log(`Called export function from ${loadMsg}`);
  } else if (typeof tasks === "object") {
    if (tasks.default) {
      processTasks(tasks.default, `${loadMsg} default export`, ns);
    } else if (Object.keys(tasks).length > 0) {
      xrun.load(ns, tasks);
      logger.log(`Loaded tasks from ${loadMsg} into namespace ${chalk.magenta(ns)}`);
    } else {
      logger.log(`Loaded ${loadMsg}`);
    }
  } else {
    logger.log(`Unknown export type ${chalk.yellow(typeof tasks)} from ${loadMsg}`);
  }
}

function loadTasks(opts, searchResult) {
  if (!opts.require && !searchResult.xrunFile) {
    logger.quiet(false);
    logger.log(`No ${config.taskFile} found - ${myPkg.name} has nothing to do
    Please create ${config.taskFile} - sample: https://www.npmjs.com/package/${myPkg.name}#a-simple-example `);
    exit(1);
  }

  npmLoader(xrun, opts);

  if (opts.require) {
    opts.require.forEach(xmod => {
      let file;
      try {
        file = requireAt(process.cwd()).resolve(xmod);
      } catch (err) {
        logger.log(
          ck`<red>ERROR:</> <yellow>Unable to require module</> <cyan>'${xmod}'</> - <red>${err.message}</>`
        );
        return;
      }
      const tasks = loadTaskFile(file);
      if (tasks) {
        const loadMsg = chalk.green(xmod);
        processTasks(tasks, loadMsg);
      }
    });
  } else {
    const tasks = searchResult.xrunFile && loadTaskFile(searchResult.xrunFile);
    if (!tasks) return;

    const loadMsg = chalk.green(`${xsh.pathCwd.replace(searchResult.xrunFile)}`);
    processTasks(tasks, loadMsg);
  }
}

function parseArgs(argv, start, clapMode = false, myPath = __dirname) {
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

  const nc = new NixC({
    name: myPkg.name,
    version: myPkg.version,
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

  // xrun defaults npm option to true but
  // old xclap defaults npm option to false
  // so if user didn't supply the option, force it to false
  if (clapMode && parsed.source.npm === "default") {
    opts.npm = false;
  }

  const myDir = xsh.pathCwd.replace(Path.dirname(__dirname), ".");

  logger.log(`${chalk.green(myPkg.name)} version ${myPkg.version} at ${chalk.magenta(myDir)}`);
  logger.log(
    `${chalk.green("node.js")} version ${process.version} at ${chalk.magenta(process.execPath)}`
  );

  // don't search if user has explicitly set CWD
  const search = !opts.cwd;

  if (opts.cwd) {
    updateCwd(opts.cwd, opts);
  } else {
    opts.cwd = process.cwd();
  }

  let searchResult = {};

  if (!opts.require) {
    searchResult = searchTaskFile(search, opts);
  }

  const Pkg = optionalRequire(Path.join(opts.cwd, "package.json"), { default: {} });

  const pkgOptField = config.getPkgOpt(Pkg);

  if (pkgOptField) {
    const pkgConfig = Object.assign({}, Pkg[pkgOptField]);
    delete pkgConfig.cwd; // not allow pkg config to override cwd
    delete pkgConfig.tasks;
    nc.applyConfig(pkgConfig, parsed);
    const pkgName = chalk.magenta("CWD/package.json");
    logger.log(`Applied ${chalk.green(pkgOptField)} options from ${pkgName}`);
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

module.exports = parseArgs;

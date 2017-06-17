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
const Pkg = require("../package.json");
const npmLoader = require("./npm-loader");
const xsh = require("xsh");

function clap(argv, offset) {
  if (!argv) {
    argv = process.argv;
    offset = 2;
  }

  const claps = nixClap(argv, offset);

  logger.quiet(claps.opts.quiet);

  if (claps.opts.version) {
    console.log(Pkg.version);
    return process.exit(0);
  }

  if (claps.opts.help && claps.tasks.length === 0) {
    claps.parser.showHelp();
    return process.exit(0);
  }

  logger.log(`${chalk.green("xclap")} version ${Pkg.version}`);

  if (claps.pkgOptions) {
    const pkgName = chalk.magenta("CWD/package.json");
    logger.log(`Applied ${chalk.green("xclap __options")} from ${pkgName}`);
  }

  npmLoader(xclap, claps.opts);

  const clapDir = Path.resolve(claps.opts.dir);

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
      xclap.load("clap", clapTasks);
      logger.log(`Loaded tasks from ${loaded}`);
    } else {
      logger.log(`Unknown export type ${chalk.yellow(typeof clapTasks)} from ${loaded}`);
    }
  }

  const numTasks = xclap.countTasks();

  if (numTasks === 0) {
    logger.log(chalk.red("No tasks found - please load some."));
  } else if (claps.opts.list) {
    console.log(xclap._tasks.names().join("\n"));
    return process.exit(0);
  } else if (claps.opts.listFull) {
    console.log(xclap._tasks.fullNames().join("\n"));
    return process.exit(0);
  }

  if (claps.tasks.length === 0 || numTasks === 0) {
    xclap.printTasks();
    console.log(`${usage}\n`);
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
      logger.log(`Adding ${x} to PATH`);
      envPath.addToFront(nmBin);
    }
  }

  process.env.FORCE_COLOR = "true";

  xclap.stopOnError = claps.opts.soe;

  return xclap.run(claps.tasks.length === 1 ? claps.tasks[0] : claps.tasks);
}

module.exports = clap;

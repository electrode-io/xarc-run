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

  if (claps.opts.version) {
    console.log(Pkg.version);
    process.exit(0);
  }

  logger.log(`${chalk.green("xclap")} version ${Pkg.version}`);

  if (claps.pkgOptions) {
    const pkgName = chalk.magenta("CWD/package.json");
    logger.log(`Applied ${chalk.green("xclap __options")} from ${pkgName}`);
  }

  if (claps.opts.help && claps.tasks.length === 0) {
    claps.parser.showHelp();
    process.exit(0);
  }

  npmLoader(xclap, claps.opts);

  const clapDir = Path.resolve(claps.opts.dir);

  let clapFile;
  let clapTasks;
  const file = ["clap.js", "xclap.js", "gulpfile.js"].find(
    f => (clapTasks = optionalRequire((clapFile = Path.join(clapDir, f))))
  );

  if (!clapTasks) {
    const x = chalk.magenta(xsh.pathCwd.replace(clapDir));
    logger.log(`No ${chalk.green("clap.js")} found in ${x}`);
  } else {
    if (typeof clapTasks === "function") {
      clapTasks(xclap);
    } else if (typeof clapTasks === "object") {
      xclap.load("clap", clapTasks);
    }

    const loaded = chalk.green(`${xsh.pathCwd.replace(clapFile)}`);
    logger.log(`Loaded tasks from ${loaded}`);
  }

  const numTasks = xclap.countTasks();

  if (numTasks === 0) {
    logger.log(chalk.red("No tasks found - please load some."));
  }

  if (claps.tasks.length === 0 || numTasks === 0) {
    xclap.printTasks();
    console.log(`${usage}\n`);
    process.exit(1);
  }

  if (claps.opts.help) {
    console.log("help for tasks:", claps.tasks);
    process.exit(0);
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

  xclap.run(claps.tasks.length === 1 ? claps.tasks[0] : claps.tasks);
}

module.exports = clap;

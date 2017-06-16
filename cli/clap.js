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

function clap(argv, offset) {
  if (!argv) {
    argv = process.argv;
    offset = 2;
  }

  const claps = nixClap(argv, offset);

  logger.log(`${chalk.green("xclap")} version ${Pkg.version}`);

  if (claps.opts.help && claps.tasks.length === 0) {
    claps.parser.showHelp();
    process.exit(0);
  }

  let clapFile;
  const file = ["clap.js", "xclap.js", "gulpfile.js"].find(
    f => (clapFile = optionalRequire(Path.resolve(f)))
  );

  if (!clapFile) {
    logger.log("No clap.js found in CWD");
    process.exit(1);
  }

  const loaded = chalk.green(`$CWD/${file}`);
  logger.log(`Loaded tasks from ${loaded}`);
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
    const nmBin = Path.join("node_modules", ".bin");
    const fullNmBin = Path.resolve(nmBin);
    if (Fs.existsSync(fullNmBin)) {
      const x = chalk.magenta(`CWD/${nmBin}`);
      logger.log(`Adding ${x} to PATH`);
      envPath.addToFront(fullNmBin);
    }
  }

  xclap.run(claps.tasks.length === 1 ? claps.tasks[0] : claps.tasks);
}

module.exports = clap;

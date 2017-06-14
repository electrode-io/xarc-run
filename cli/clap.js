"use strict";

const optionalRequire = require("optional-require")(require);
const Path = require("path");
const nixClap = require("./nix-clap");
const xclap = require("..");
const chalk = require("chalk");
const logger = require("../lib/logger");
const usage = require("./usage");
const envPath = require("xsh").envPath;

function clap(argv, offset) {
  if (!argv) {
    argv = process.argv;
    offset = 2;
  }

  const claps = nixClap(argv, offset);

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

  if (claps.opts.help || claps.tasks.length === 0 || numTasks === 0) {
    xclap.printTasks();
    if (claps.opts.help) {
      console.log(`${usage}\n`);
    }
    process.exit(1);
  }

  const nmBin = Path.resolve("node_modules", ".bin");
  if (Fs.existSync(nmBin)) {
    envPath.addToFront(nmBin);
  }

  xclap.run(claps.tasks.length === 1 ? claps.tasks[0] : claps.tasks);
}

module.exports = clap;

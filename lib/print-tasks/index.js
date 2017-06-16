"use strict";

const defaults = require("../defaults");
const stringify = require("../stringify");
const chalk = require("chalk");
const assert = require("assert");
const Path = require("path");

const removeCwd = s => {
  const nmRegex = new RegExp(Path.resolve("node_modules"), "g");
  const cwdRegex = new RegExp(process.cwd(), "g");
  return s.replace(nmRegex, "CWD/~").replace(cwdRegex, "CWD");
};

const printNSTasks = (title, names, tasks, options) => {
  let guideChar = ".";
  let nameColor = "cyan";

  const taskType = task => task !== null && task !== undefined && task.constructor.name;

  const maxNameLen =
    2 +
    names.reduce((l, x) => {
      const task = tasks[x];
      if (taskType(task) === "Object" && !task.desc) {
        return l;
      }
      return x.length > l ? x.length : l;
    }, 0);

  const printTask = name => {
    const task = tasks[name];
    const tof = taskType(task);

    const paddedArr = new Array(Math.max(1, maxNameLen - name.length));
    const paddedName = chalk[nameColor](`  ${name} ${paddedArr.join(guideChar)}`);
    if (tof === "String") {
      console.log(paddedName, chalk.magenta(removeCwd(task)));
    } else if (tof === "Array") {
      console.log(paddedName, chalk.green(`${removeCwd(stringify(task))}`));
    } else if (tof === "Object") {
      if (!task.desc) {
        return;
      }
      console.log(paddedName, chalk.yellow(task.desc));
      const spacePad = new Array(maxNameLen + 4).join(" ");
      if (task.task) {
        console.log(chalk.dim.green(`${spacePad}  tasks: ${removeCwd(stringify(task.task))}`));
      }
      if (task.dep) {
        console.log(chalk.dim.cyan(`${spacePad}  deps: ${removeCwd(stringify(task.dep))}`));
      }
    } else if (tof === "Function") {
      console.log(paddedName, "function", task.name);
    } else {
      console.log(paddedName, chalk.red(`Unknown task type ${tof}`));
    }
    guideChar = guideChar === "." ? "-" : ".";
    nameColor = nameColor === "cyan" ? "blue" : "cyan";
  };

  console.log(chalk.underline(title));
  console.log("");

  names.sort().forEach(printTask);
  console.log("");
};

function printTasks(xtasks, options) {
  const namespaces = xtasks._namespaces;
  const tasks = xtasks._tasks;
  namespaces.forEach(n => {
    const nTasks = tasks[n];
    assert(nTasks, `Task namespace ${n} is falsy`);
    if (Object.keys(nTasks).length === 0) {
      return;
    }
    console.log(chalk.inverse.bold.red(`Namespace '${n}'`));
    const taskNames = Object.keys(nTasks).reduce((an, tn) => {
      let lbl;
      if (tn.match(/(^\.)|([$~])/)) {
        lbl = "Hidden";
      } else if (tn.match(/^[a-zA-Z_0-9]+$/)) {
        lbl = "Primary";
      } else {
        lbl = "Other";
      }
      an[lbl] = an[lbl] || [];
      an[lbl].push(tn);
      return an;
    }, {});
    const isEmpty = x => !x || x.length === 0;
    ["Primary", "Other"]
      .filter(tt => !isEmpty(taskNames[tt]))
      .forEach(tt => printNSTasks(`${tt} Tasks`, taskNames[tt], nTasks));
  });
}

module.exports = printTasks;

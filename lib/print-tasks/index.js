"use strict";

const defaults = require("../defaults");
const stringify = require("../stringify");
const chalk = require("chalk");
const assert = require("assert");
const Path = require("path");
const xsh = require("xsh");

const replaceCwd = p => xsh.pathCwdNm.replace(p, null, "g");

const stringifyTask = x => {
  x = stringify(x);
  /* istanbul ignore next */
  if (Path.sep === "\\") {
    /* istanbul ignore next */
    x = x.replace(/\\\\/g, "\\");
  }
  return replaceCwd(x);
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
      console.log(paddedName, chalk.magenta(replaceCwd(task)));
    } else if (tof === "Array") {
      console.log(paddedName, chalk.green(`${stringifyTask(task)}`));
    } else if (tof === "Object") {
      if (!task.desc) {
        return;
      }
      console.log(paddedName, chalk.yellow(task.desc));
      const spacePad = new Array(maxNameLen + 4).join(" ");
      if (task.task) {
        console.log(chalk.dim.green(`${spacePad}  tasks: ${stringifyTask(task.task)}`));
      }
      if (task.dep) {
        console.log(chalk.dim.cyan(`${spacePad}  deps: ${stringifyTask(task.dep)}`));
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
      .forEach(tt => printNSTasks(chalk.bold(`${tt} Tasks`), taskNames[tt], nTasks));
  });
}

module.exports = printTasks;

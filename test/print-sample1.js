"use strict";

const xrun = require("..");
const print1 = require("./fixtures/print1");

xrun.load(print1);
xrun.load("ns1", print1);

xrun.printTasks();

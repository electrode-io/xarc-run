"use strict";

const xclap = require("..");
const print1 = require("./fixtures/print1");

xclap.load(print1);
xclap.load("ns1", print1);

xclap.printTasks();

"use strict";

const xclap = require("..");
const sample1 = require("./fixtures/sample1");

xclap.load(sample1);
xclap.run("foo2");

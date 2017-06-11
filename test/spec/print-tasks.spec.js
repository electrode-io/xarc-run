"use strict";

const xclap = require("../..");
const print1 = require("../fixtures/print1");
const interceptStdout = require("../intercept-stdout");
const Fs = require("fs");
const Path = require("path");
const expect = require("chai").expect;

describe("print tasks", function() {
  it("should print tasks", () => {
    const intercept = interceptStdout.intercept(true);
    xclap.load(print1);
    xclap.load("ns1", print1);
    xclap.load("ns2", {});
    xclap.printTasks();
    intercept.restore();
    const outFile = process.version.startsWith("v4.")
      ? "test/fixtures/print1.out.node4.txt"
      : "test/fixtures/print1.out.txt";
    const out = Fs.readFileSync(Path.resolve(outFile)).toString();
    expect(intercept.stdout.join("")).to.equal(out);
  });
});

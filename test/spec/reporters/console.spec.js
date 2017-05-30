"use strict";

const XReporterConsole = require("../../../lib/reporters/console");
const XClap = require("../../../lib/xclap");
const XQItem = require("../../../lib/xqitem");
const expect = require("chai").expect;
const chalk = require("chalk");

describe("XReporterConsole", function () {
  const saved = chalk.enabled;
  before(() => chalk.enabled = false);
  after(() => chalk.enabled = saved);
  it("should indent by qitem level", () => {
    const xclap = new XClap();
    const reporter = new XReporterConsole(xclap);
    const xqi = new XQItem({ name: "test" });
    expect(reporter._indent(xqi)).to.equal("");
    xqi.level = 1;
    expect(reporter._indent(xqi)).to.equal("-");
    xqi.level = 5;
    expect(reporter._indent(xqi)).to.equal(".....");
    expect(reporter._indent(xqi)).to.equal("-----");
    expect(reporter._indent(xqi)).to.equal(".....");
  });
});

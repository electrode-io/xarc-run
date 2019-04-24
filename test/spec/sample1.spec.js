"use strict";

const XClap = require("../../lib/xclap");
const sample1 = require("../fixtures/sample1");
const expect = require("chai").expect;
const xstdout = require("xstdout");

describe("sample1", function() {
  it("should run sample1:foo2 tasks", done => {
    const intercept = xstdout.intercept(true);
    const expectOutput = [
      "a direct shell command xfoo2",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "anonymous",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "cccc",
      "cccc",
      "cccc",
      "cccc",
      "cccc",
      "concurrent anon",
      "function task for foo3",
      "hello, this is xfoo1",
      "hello, this is xfoo4",
      "hello, this is xfoo4",
      "hello, this is xfoo4",
      "test anon shell",
      "this is foo3Dep"
    ];
    const xclap = new XClap(sample1);
    xclap.run("foo2", err => {
      intercept.restore();
      if (err) {
        return done(err);
      }
      const output = intercept.stdout.sort().map(x => x.trim());
      expect(output).to.deep.equal(expectOutput.sort());
      done();
    });
  });

  it("should run sample1:foo2b tasks with failure", done => {
    let intercept = xstdout.intercept(true);
    const expectOutput = [
      "a direct shell command xfoo2",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "aaaaa",
      "anonymous",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "bbbb",
      "cccc",
      "concurrent anon",
      "function task for foo3",
      "hello, this is xfoo1",
      "test anon shell",
      "this is foo3Dep"
    ];
    const xclap = new XClap(sample1);
    xclap.run("foo2ba", err => {
      intercept.restore();
      expect(err).to.exist;
      const output = intercept.stdout.sort().map(x => x.trim());
      expect(output).to.deep.equal(expectOutput.sort());
      intercept = xstdout.intercept(true);
      xclap.waitAllPending(() => {
        intercept.restore();
        done();
      });
    });
  });

  it("should run sample1:foo2b tasks with stopOnError false", done => {
    let intercept = xstdout.intercept(true);
    const xclap = new XClap(sample1);
    xclap.stopOnError = false;
    xclap.run("foo2ba", err => {
      intercept.restore();
      expect(err).to.exist;
      expect(err.more).to.exist;
      expect(err.more.length).to.equal(1);
      expect(err.message).to.equal("xerr");
      expect(err.more[0].message).to.equal("xerr");
      intercept = xstdout.intercept(true);
      xclap.waitAllPending(err => {
        intercept.restore();
        done(err);
      });
    });
  });
});

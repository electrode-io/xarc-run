"use strict";

const exec = require("../../lib/exec");
const interceptStdout = require("../intercept-stdout");
const expect = require("chai").expect;

describe("exec", function() {
  it("should fail with unknown cmd", done => {
    exec("echox test", err => {
      expect(err).to.be.ok;
      done();
    });
  });

  it("should be silent if flag is true", done => {
    const intercept = interceptStdout.intercept();
    exec("echo test blah blah", true, (err, output) => {
      intercept.restore();
      expect(err).to.not.exist;
      expect(output.stdout).include("test blah blah");
      expect(intercept.stdout).to.be.empty;
      done();
    });
  });

  it("should not be silent if flag is false", done => {
    const intercept = interceptStdout.intercept(true);

    exec("echo test blah blah", false, (err, output) => {
      intercept.restore();
      expect(err).to.not.exist;
      expect(output.stdout).include("test blah blah");
      expect(intercept.stdout.join()).include("test blah blah");
      done();
    });
  });
});

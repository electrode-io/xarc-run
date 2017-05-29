const XClap = require("../../lib/xclap");
const sample1 = require("../fixtures/sample1");
const expect = require("chai").expect;
const interceptStdout = require("../intercept-stdout");

describe("sample1", function() {
  it("should run sample1:foo2 tasks", done => {
    const intercept = interceptStdout.intercept(true);
    const expectOutput = [
      "hello, this is xfoo1\n",
      "a direct shell command xfoo2\n",
      "test anon shell\n",
      "aaaaa\n",
      "aaaaa\n",
      "aaaaa\n",
      "bbbb\n",
      "bbbb\n",
      "bbbb\n",
      "anonymous\n",
      "this is foo3Dep\n",
      "function task for foo3\n",
      "concurrent anon\n",
      "aaaaa\n",
      "bbbb\n",
      "bbbb\n",
      "aaaaa\n",
      "cccc\n",
      "aaaaa\n",
      "bbbb\n",
      "bbbb\n",
      "aaaaa\n",
      "cccc\n",
      "aaaaa\n",
      "bbbb\n",
      "bbbb\n",
      "aaaaa\n",
      "cccc\n",
      "hello, this is xfoo4\n",
      "hello, this is xfoo4\n",
      "hello, this is xfoo4\n"
    ];
    const xclap = new XClap(sample1);
    xclap.run("foo2", err => {
      intercept.restore();
      if (err) {
        return done(err);
      }
      expect(intercept.stdout).to.deep.equal(expectOutput);
      done();
    });
  });

  it("should run sample1:foo2b tasks", done => {
    let intercept = interceptStdout.intercept(true);
    const expectOutput = [
      "hello, this is xfoo1\n",
      "a direct shell command xfoo2\n",
      "test anon shell\n",
      "aaaaa\n",
      "aaaaa\n",
      "aaaaa\n",
      "bbbb\n",
      "bbbb\n",
      "bbbb\n",
      "anonymous\n",
      "this is foo3Dep\n",
      "function task for foo3\n",
      "concurrent anon\n"
    ];
    const xclap = new XClap(sample1);
    xclap.run("foo2ba", err => {
      intercept.restore();
      expect(err).to.exist;
      expect(intercept.stdout).to.deep.equal(expectOutput);
      intercept = interceptStdout.intercept(true);
      xclap.waitAllPending(() => {
        intercept.restore();
        done();
      });
    });
  });

  it("should run sample1:foo2b tasks with stopOnError false", done => {
    const intercept = interceptStdout.intercept(true);
    const xclap = new XClap(sample1);
    xclap.stopOnError = false;
    xclap.run("foo2ba", err => {
      intercept.restore();
      expect(err).to.exist;
      expect(err.length).to.equal(2);
      expect(err[0].message).to.equal("xerr");
      expect(err[1].message).to.equal("xerr");
      done();
    });
  });
});

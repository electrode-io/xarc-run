"use strict";

const xclap = require("../..");
const expect = require("chai").expect;
describe("index", function() {
  it("should export a default instance", () => {
    expect(xclap).to.exist;
  });

  it("should have exec to make XTaskSpec for shell exec", () => {
    expect(xclap.exec("hello", "tty").toString()).to.equal(`exec(tty) 'hello'`);
    expect(xclap.exec("hello", ["tty", "noenv"]).toString()).to.equal(`exec(tty,noenv) 'hello'`);
    expect(xclap.exec("echo hello").toString()).to.equal(`exec 'echo hello'`);

    expect(xclap.exec(["echo", "hello", "world"], "tty").toString()).to.equal(
      `exec(tty) 'echo hello world'`
    );
    expect(xclap.exec({ cmd: "hello", flags: { tty: true } }).toString()).to.equal(
      `exec(tty) 'hello'`
    );
    expect(xclap.exec({ command: "hello", flags: { tty: true } }).toString()).to.equal(
      `exec(tty) 'hello'`
    );
    expect(() => xclap.exec(1).toString()).to.throw("unknown spec type number");
  });
});

"use strict";

const xclap = require("../..");
const expect = require("chai").expect;

describe("index", function() {
  it("should export a default instance", () => {
    expect(xclap).to.exist;
  });

  describe("concurrent", function() {
    it("should create concurrent array from variadic params", () => {
      const t1 = xclap.concurrent("a", "b");
      expect(t1[0].toString()).to.equal("Symbol(concurrent)");
      expect(t1.slice(1)).to.deep.equal(["a", "b"]);
    });

    it("should create concurrent array with alias parallel from array", () => {
      const t1 = xclap.parallel(["a", "b"]);
      expect(t1[0].toString()).to.equal("Symbol(concurrent)");
      expect(t1.slice(1)).to.deep.equal(["a", "b"]);
    });

    it("should not change single task", () => {
      const t1 = xclap.concurrent("a");
      expect(t1).to.equal("a");
    });

    it("should create concurrent array from array of single element", () => {
      const t1 = xclap.concurrent(["a"]);
      expect(t1[0].toString()).to.equal("Symbol(concurrent)");
      expect(t1.slice(1)).to.deep.equal(["a"]);
    });
  });

  describe("serial", function() {
    it("should create serial array from variadic params", () => {
      const t1 = xclap.serial("a", "b");
      expect(t1[0].toString()).to.equal("Symbol(serial)");
      expect(t1.slice(1)).to.deep.equal(["a", "b"]);
    });

    it("should create serial array from array", () => {
      const t1 = xclap.serial(["a", "b"]);
      expect(t1[0].toString()).to.equal("Symbol(serial)");
      expect(t1.slice(1)).to.deep.equal(["a", "b"]);
    });

    it("should not change single task", () => {
      const t1 = xclap.serial("a");
      expect(t1).to.equal("a");
    });

    it("should create serial array from array of single element", () => {
      const t1 = xclap.serial(["a"]);
      expect(t1[0].toString()).to.equal("Symbol(serial)");
      expect(t1.slice(1)).to.deep.equal(["a"]);
    });
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

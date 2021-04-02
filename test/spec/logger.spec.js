"use strict";

const logger = require("../../lib/logger");
const xstdout = require("xstdout");
const expect = require("chai").expect;

describe("logger", function() {
  beforeEach(() => {
    logger.resetBuffer();
    logger.coloring(false);
    logger.buffering(false);
    logger.quiet(false);
  });

  it("should log to stdout in coloring off", () => {
    const intercept = xstdout.intercept(true);

    try {
      logger.coloring(false);
      logger.log("test", "hello", 1, "world");
    } finally {
      intercept.restore();
    }

    expect(intercept.stdout.join("")).includes("test hello 1 world");
  });

  it("should log to stdout and buffer in coloring off", () => {
    const intercept = xstdout.intercept(true);

    try {
      logger.coloring(false);
      logger.buffering(true);
      logger.log("test", "hello", 1, "world");
    } finally {
      intercept.restore();
    }

    expect(intercept.stdout.join("")).includes("test hello 1 world");
    expect(logger.buffer.join("")).includes("test hello 1 world");
  });

  it("should log to stdout in coloring on", () => {
    const intercept = xstdout.intercept(true);

    try {
      logger.coloring(true);
      logger.log("test", "hello", 1, "world");
      // second call to coloring with same value should have no effect
      logger.coloring(true);
    } finally {
      intercept.restore();
    }

    expect(intercept.stdout.join("")).includes("test hello 1 world");
    expect(intercept.stdout.join("")).includes("test hello 1 world");
  });

  it("should pad2 1 to 01", () => {
    expect(logger.pad2(1)).to.equal("01");
  });

  it("should pad2 12 to 12", () => {
    expect(logger.pad2(12)).to.equal("12");
  });

  it("formatElapse should format msec to minutes", () => {
    expect(logger.formatElapse(60000)).to.equal("1.00 min");
    expect(logger.formatElapse(692384)).to.equal("11.54 min");
  });

  it("formatElapse should format msec to seconds", () => {
    expect(logger.formatElapse(1000)).to.equal("1.00 sec");
    expect(logger.formatElapse(14534)).to.equal("14.53 sec");
  });

  it("formatElapse should format msec ", () => {
    expect(logger.formatElapse(999)).to.equal("999 ms");
    expect(logger.formatElapse(163)).to.equal("163 ms");
  });

  it("should log nothing in quiet mode", () => {
    logger.quiet(true);
    const intercept = xstdout.intercept(true);

    try {
      logger.log("test");
    } finally {
      intercept.restore();
    }

    expect(logger.buffer).to.deep.equal([]);
    expect(intercept.stdout).to.be.empty;
    expect(intercept.stderr).to.be.empty;
    logger.quiet(false);
  });

  it("should log error even in quiet mode", () => {
    logger.quiet(true);
    const intercept = xstdout.intercept(true);

    try {
      logger.error("test");
    } finally {
      intercept.restore();
    }

    expect(intercept.stdout.join("")).includes("test");
    logger.quiet(false);
  });

  it("should save to buffer in quiet mode", () => {
    logger.quiet(true);
    logger.buffering(true);

    const intercept = xstdout.intercept(true);

    try {
      logger.log("test", 1, "hello", "world");
      logger.log("test", 2, "hello", "world");
      logger.log("test", 3, "hello", "world");
      logger.log("test", 4, "hello", "world");

      // test second calls
      logger.buffering(true);
    } finally {
      intercept.restore();
    }

    expect(intercept.stdout).to.be.empty;
    expect(intercept.stderr).to.be.empty;

    const buf = logger.buffer;
    for (let i = 1; i <= 4; i++) {
      expect(buf[i - 1]).includes(`test ${i} hello world`);
    }

    logger.resetBuffer();
    expect(logger.buffer).to.deep.equal([]);

    logger.quiet(false);
  });

  it("should flush buffer when reset", () => {
    logger.quiet(true);
    logger.buffering(true);

    let intercept = xstdout.intercept(true);

    try {
      logger.log("test", 1, "hello", "world");
      logger.log("test", 2, "hello", "world");
      logger.log("test", 3, "hello", "world");
      logger.log("test", 4, "hello", "world");
    } finally {
      intercept.restore();
    }

    expect(intercept.stdout).to.be.empty;
    expect(intercept.stderr).to.be.empty;

    const verify = buf => {
      for (let i = 1; i <= 4; i++) {
        expect(buf[i - 1]).includes(`test ${i} hello world`);
      }
    };
    verify(logger.buffer);

    intercept = xstdout.intercept(true);
    try {
      logger.quiet(false);
      logger.resetBuffer(true);
    } finally {
      intercept.restore();
    }

    expect(logger.buffer).to.deep.equal([]);
    verify(intercept.stdout);

    logger.quiet(false);
  });
});

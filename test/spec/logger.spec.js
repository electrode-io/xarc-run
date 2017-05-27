const logger = require("../../lib/logger");
const interceptStdout = require("../intercept-stdout");
const expect = require("chai").expect;

describe("logger", function() {
  it("should log to stdout", () => {
    const intercept = interceptStdout.intercept(true);
    logger.log("test");
    intercept.restore();
    expect(intercept.stdout.join("")).include("test");
  });

  it("should pad2 1 to 01", () => {
    expect(logger.pad2(1)).to.equal("01");
  });

  it("should pad2 12 to 12", () => {
    expect(logger.pad2(12)).to.equal("12");
  });
});

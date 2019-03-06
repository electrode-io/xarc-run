"use strict";

const XTaskSpec = require("../../lib/xtask-spec");
const expect = require("chai").expect;

describe("xtask-spec", function() {
  it("should creeate exec command", () => {
    expect(new XTaskSpec({ cmd: "hello", flags: { tty: true } }).toString()).to.equal(
      `exec(tty) 'hello'`
    );
    expect(
      new XTaskSpec({
        command: "hello",
        flags: { tty: true },
        execOptions: { env: { foo: "bar" } }
      }).toString()
    ).to.equal(`exec(tty) {foo=bar} 'hello'`);
  });

  it("should handle unknown type in toString", () => {
    expect(new XTaskSpec({ type: "blah", command: "hello" }).toString()).to.equal(
      `XTaskSpec - Unknown type blah`
    );
  });
});

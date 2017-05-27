const genXqId = require("../../lib/gen-xqid");
const expect = require("chai").expect;

describe("gen-xqid", function() {
  it("should gen ID with tag", done => {
    const a = genXqId("test");
    const b = genXqId("test");
    expect(a).to.match(/^test/);
    expect(a).to.not.equal(b);
    done();
  });

  it("should gen ID w/o tag", done => {
    const a = genXqId();
    const b = genXqId();
    expect(a).to.not.equal(b);
    done();
  });
});

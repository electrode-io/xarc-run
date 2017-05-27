const xclap = require("../..");
const expect = require("chai").expect;
describe("index", function() {
  it("should export a default instance", () => {
    expect(xclap).to.exist;
  });
});

"use strict";

const xclap = require("../../..");
const sample1 = require("../../fixtures/sample1");
const expect = require("chai").expect;
const interceptStdout = require("../../intercept-stdout");
const chalk = require("chalk");

describe("sample1 console report", function () {
  before(() => chalk.enabled = false);
  after(() => chalk.enabled = true);

  it("should log report to console", done => {
    const expectOutput =
      `Processing task foo2 serial array ["foo2a"]
-Processing task foo2a serial array ["xfoo1","xfoo2","~$echo test anon shell",[".","a","b"],"func","foo3",["a","b",["a","c"],"xfoo4","b","xfoo4","func"],"xfoo4"]
..Executing task xfoo1 as function
>>Done Executing task xfoo1 as function
--Executing task xfoo2 echo "a direct shell command xfoo2"
>>Done Executing task xfoo2 echo "a direct shell command xfoo2"
..Executing echo test anon shell
>>Done Executing echo test anon shell
--Processing task foo2a.S serial array [".","a","b"]
...Executing task a as function
>>>Done Executing task a as function
---Executing task b as function
>>>Done Executing task b as function
>>Done Processing task foo2a.S serial array [".","a","b"]
..Executing task foo2a.S anonymous function
>>Done Executing task foo2a.S anonymous function
--Processing task foo3-dep serial array ["foo3Dep"]
...Executing task foo3Dep as function
>>>Done Executing task foo3Dep as function
--Executing task foo3 as function
>>Done Executing task foo3 as function
..Processing task foo2a.S concurrent array ["a","b",["a","c"],"xfoo4","b","xfoo4","func"]
---Processing task foo2a.S.C concurrent array ["a","c"]
...Executing task foo2a.S.C anonymous function
---Executing task a as function
...Executing task b as function
---Executing task xfoo4 as function
...Executing task b as function
---Executing task xfoo4 as function
>>>Done Executing task foo2a.S.C anonymous function
....Executing task a as function
----Executing task c as function
>>>Done Executing task xfoo4 as function
>>>Done Executing task xfoo4 as function
>>>Done Executing task a as function
>>>Done Executing task b as function
>>>Done Executing task b as function
>>>>Done Executing task a as function
>>>>Done Executing task c as function
>>>Done Processing task foo2a.S.C concurrent array ["a","c"]
>>Done Processing task foo2a.S concurrent array ["a","b",["a","c"],"xfoo4","b","xfoo4","func"]
..Executing task xfoo4 as function
>>Done Executing task xfoo4 as function
>Done Processing task foo2a serial array ["xfoo1","xfoo2","~$echo test anon shell",[".","a","b"],"func","foo3",["a","b",["a","c"],"xfoo4","b","xfoo4","func"],"xfoo4"]
Done Processing task foo2 serial array ["foo2a"]
`;
    const intercept = interceptStdout.intercept(true);
    xclap.load(sample1);
    xclap.run("foo2", (err) => {
      intercept.restore();
      if (err) {
        return done(err);
      }
      const output = intercept.stdout
        .filter(x => x.match(/^\[/))
        .map(x => x.replace(/ \([0-9\.]+ ms\)/, ""))
        .map(x => x.replace(/^\[[^\]]+\] /, ""))
        .join("");
      expect(output).to.equal(expectOutput);
      done();
    });
  });

  it("should log failure report to console", done => {
    const expectOutput =
      `Processing task foo2ba serial array ["xfoo1","xfoo2","~$echo test anon shell",[".","a","b"],"func","foo3",["a","b",["a","c"],"xerr","b","xerr","func"],"xfoo4"]
-Executing task xfoo1 as function
>Done Executing task xfoo1 as function
.Executing task xfoo2 echo "a direct shell command xfoo2"
>Done Executing task xfoo2 echo "a direct shell command xfoo2"
-Executing echo test anon shell
>Done Executing echo test anon shell
.Processing task foo2ba.S serial array [".","a","b"]
--Executing task a as function
>>Done Executing task a as function
..Executing task b as function
>>Done Executing task b as function
>Done Processing task foo2ba.S serial array [".","a","b"]
-Executing task foo2ba.S anonymous function
>Done Executing task foo2ba.S anonymous function
.Processing task foo3-dep serial array ["foo3Dep"]
--Executing task foo3Dep as function
>>Done Executing task foo3Dep as function
.Executing task foo3 as function
>Done Executing task foo3 as function
-Processing task foo2ba.S concurrent array ["a","b",["a","c"],"xerr","b","xerr","func"]
..Processing task foo2ba.S.C concurrent array ["a","c"]
--Executing task foo2ba.S.C anonymous function
..Executing task a as function
--Executing task b as function
..Executing task xerr as function
--Executing task b as function
..Executing task xerr as function
>>Done Executing task foo2ba.S.C anonymous function
---Executing task a as function
...Executing task c as function
>>Failed Executing task xerr as function
>>Failed Executing task xerr as function
>Done Processing task foo2ba.S concurrent array ["a","b",["a","c"],"xerr","b","xerr","func"]
Done Processing task foo2ba serial array ["xfoo1","xfoo2","~$echo test anon shell",[".","a","b"],"func","foo3",["a","b",["a","c"],"xerr","b","xerr","func"],"xfoo4"]
`;
    let intercept = interceptStdout.intercept(true);
    xclap.load(sample1);
    xclap.run("foo2ba", (err) => {
      intercept.restore();
      expect(err).to.exist;
      expect(err.length).to.equal(2);
      expect(err[0].message).to.equal("xerr");
      expect(err[1].message).to.equal("xerr");
      const output = intercept.stdout
        .filter(x => x.match(/^\[/))
        .map(x => x.replace(/ \([0-9\.]+ ms\)/, ""))
        .map(x => x.replace(/^\[[^\]]+\] /, ""))
        .join("");
      expect(output).to.equal(expectOutput);
      intercept = interceptStdout.intercept(true);
      xclap.waitAllPending(() => {
        intercept.restore();
        done();
      });
    });
  })

});

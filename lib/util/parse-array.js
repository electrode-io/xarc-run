"use strict";

const assert = require("assert");

module.exports = function pa(str) {
  const nest = [];
  let arr = [];
  let s = str.trim();
  if (!s) return arr;
  while (true) {
    // start of an array
    if (s.startsWith("[")) {
      nest.push(arr);
      arr.push((arr = []));
      s = s.substring(1).trimLeft();
      continue; // handle multiple consecutive ['s like [[[a]]]
    } else {
      assert(nest.length > 0, "array missing [");
    }

    // extract non-empty element up to ] or ,
    const m = s.match(/[\],]/);
    assert(m, "array missing ]");
    const element = s.substring(0, m.index).trim();
    if (element) arr.push(element);

    s = s.substring(m.index + 1).trimLeft();

    // end of an array
    if (m[0] === "]") {
      arr = nest.pop();
      assert(arr, "array has extra ]");
      if (s.startsWith(",")) {
        s = s.substring(1).trimLeft();
      }
    }
    if (!s) break;
    assert(nest.length > 0, "extra data at end of array");
  }
  assert(nest.length === 0, "array missing ]");
  return arr[0];
};

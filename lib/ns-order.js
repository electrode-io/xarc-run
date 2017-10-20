"use strict";

const each = require("lodash.foreach");
const assert = require("assert");

class NSOrder {
  constructor() {
    this._namespaces = [];
    this._overrides = {};
  }

  //
  // make name order before overrides (string or array of string)
  //
  // the ordering is kept by an integer
  // each new namespace is assign value of 1
  // then the max of values of its overrides is looked up
  // if its value is not > max, then it's set to max + 1
  // process repeated until all override max are smaller
  //
  // finally sort namespace by order value
  //
  add(name, overrides) {
    let overrideMap = this._overrides[name];
    if (!overrideMap) {
      overrideMap = this._overrides[name] = { value: 1, others: [] };
      this._namespaces.push(name);
    }

    if (!overrides) return this._namespaces;

    if (!Array.isArray(overrides)) overrides = [overrides];

    overrideMap.others = overrideMap.others.concat(overrides);

    // do a first level circular check
    each(this._overrides, (ov, ns) => {
      if (ns !== name && overrideMap.others.indexOf(ns) >= 0 && ov.others.indexOf(name) >= 0) {
        throw new Error(`circular namespace override between '${name}' and '${ns}'`);
      }
    });

    // init all values 1
    each(this._overrides, v => (v.value = 1));

    // assign value base on override map
    let done;
    let n = 0;
    do {
      done = true;
      each(this._overrides, ov => {
        if (ov.others.length === 0) return;
        const max = ov.others.reduce(
          (max, oname) =>
            Math.max((this._overrides[oname] && this._overrides[oname].value) || 0, max),
          1
        );
        if (ov.value <= max) {
          done = false;
          ov.value = 1 + max;
        }
      });
      n++;
      assert(
        n < 10,
        "calculating namespace order looped too many times, there may be circular overrides"
      );
    } while (!done);

    this._namespaces.sort((a, b) => this._overrides[b].value - this._overrides[a].value);

    return this._namespaces;
  }
}

module.exports = NSOrder;

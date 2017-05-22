"use strict";

const genXqId = require("./gen-xqid");
const assert = require("assert");

class XQItem {
  constructor(options) {
    this.id = genXqId();
    this.resolved = [];
    this.children = [];
    this.pending = 0;

    if (options.name) {
      this.name = options.name;
    }

    if (typeof options.value === "string") {
      assert(!this.name, "can't specify XQItem name and string value");
      this.name = options.value;
    } else if (options.value) {
      this.resolved.push(options.value);
    }

    this.type = options.type;
    this.parentId = options.parentId;
    this.anon = options.anon;
  }

  lookup(tasks) {
    this.resolved.push({ top: true, item: tasks.lookup(this.name) });
  }

  value() {
    return this.resolved.length === 0 ? this.name : this.resolved[this.resolved.length - 1];
  }

  child(x) {
    this.children.push(x);
  }
}

module.exports = XQItem;

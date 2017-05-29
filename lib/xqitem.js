"use strict";

const genXqId = require("./gen-xqid");
const assert = require("assert");

class XQItem {
  constructor(options) {
    this.id = genXqId();
    this.resolved = [];
    this.children = [];
    this.pending = 0;
    this.level = options.level || 0;

    if (typeof options.name === "string") {
      this.name = options.name;
    }

    assert(this.name, "xqitem must have a name");

    if (options.value) {
      this.setResolve(options.value);
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

  setResolve(value) {
    this.resolved.push(value);
  }

  addChild(x) {
    this.children.push(x);
  }
}

module.exports = XQItem;

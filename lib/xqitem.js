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
    this.ns = options.ns || "";

    if (typeof options.name === "string") {
      this.argv = options.name.trim().split(" ");
      this.name = this.argv[0];
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
    const found = tasks.lookup(this.name);
    this.setResolve({ top: true, item: found.item });
    return found;
  }

  value() {
    return this.resolved.length === 0 ? this.name : this.resolved[this.resolved.length - 1];
  }

  setResolve(value) {
    this.resolved.push(value);
  }

  setNamespace(ns) {
    this.ns = ns;
  }

  addChild(x) {
    this.children.push(x);
  }
}

module.exports = XQItem;

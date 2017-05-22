"use strict";

const XQItem = require("./xqitem");

class XQTree {
  constructor() {
    this.tree = {};
    this._items = {};
  }

  create(options, parent) {
    options = Object.assign({ parentId: parent && parent.id }, options);

    const x = new XQItem(options);
    this._items[x.id] = x;

    if (parent) {
      parent.children.push(x);
    } else {
      this.tree[x.id] = x;
    }

    return x;
  }

  parent(qItem) {
    const x = this._items[qItem.parentId];
    return x;
  }

  item(id) {
    return this._items[id];
  }
}

module.exports = XQTree;

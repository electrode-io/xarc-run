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
      parent.addChild(x);
      x.level = parent.level !== undefined ? parent.level + 1 : 0;
    } else {
      this.tree[x.id] = x;
      x.level = 0;
    }

    return x;
  }

  parent(qItem) {
    const x = this._items[qItem.parentId];
    return x;
  }

  parentName(qItem) {
    const parent = this.parent(qItem);
    return parent && parent.name;
  }

  item(id) {
    return this._items[id];
  }
}

module.exports = XQTree;

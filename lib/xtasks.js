"use strict";

const assert = require("assert");
const defaults = require("./defaults");

class XTasks {
  constructor(namespace, tasks) {
    this._tasks = { [defaults.NAMESPACE]: {} };
    if (namespace) {
      this.load(namespace, tasks);
    }
  }

  load(namespace, tasks) {
    if (tasks === undefined) {
      tasks = namespace;
      namespace = defaults.NS_SEP;
    }
    assert(tasks && typeof tasks === "object", "Invalid tasks");
    if (this._tasks[namespace] === undefined) {
      this._tasks[namespace] = {};
    }
    Object.assign(this._tasks[namespace], tasks);
  }

  lookup(name) {
    assert(name, "Invalid empty task name");
    const parts = name.split(defaults.NS_SEP);
    assert(parts.length > 0, "Invalid task name");
    let item;
    if (parts.length === 1) {
      item = this._searchNamespaces(name);
    } else {
      const ns = parts[0] || defaults.NAMESPACE;
      name = parts[1];
      assert(ns, "Invalid tasks namespace");
      const nsTasks = this._tasks[ns];
      assert(nsTasks, `No task namespace ${ns} exist`);
      item = nsTasks[name];
    }
    assert(item, `Task ${name} not found`);
    return item;
  }

  _searchNamespaces(name) {
    const ns = Object.keys(this._tasks);
    ns.unshift(defaults.NAMESPACE);
    for (var i = 0; i < ns.length; i++) {
      const x = this._tasks[ns[i]][name];
      if (x) {
        return x;
      }
    }
  }
}

module.exports = XTasks;

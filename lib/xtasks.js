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

  count() {
    return Object.keys(this._tasks).reduce((x, ns) => {
      return x + Object.keys(this._tasks[ns]).length;
    }, 0);
  }

  lookup(name) {
    assert(name, "Invalid empty task name");
    let ns;
    let item;
    // Not start with namespace separator - no namespace
    if (!name.startsWith(defaults.NS_SEP)) {
      item = this._searchNamespaces(name);
    } else {
      const x2 = name.indexOf(defaults.NS_SEP, 1);
      if (x2 > 0) {
        ns = name.substring(1, x2);
        assert(ns, `Invalid namespace in task name ${name}`);
        name = name.substring(x2 + 1);
      } else {
        ns = defaults.NS_SEP;
        name = name.substr(1);
      }
      const nsTasks = this._tasks[ns];
      assert(nsTasks, `No task namespace ${ns} exist`);
      item = nsTasks[name];
    }
    assert(item, `Task ${name}${ns ? " in namespace " + ns : ""} not found`);
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

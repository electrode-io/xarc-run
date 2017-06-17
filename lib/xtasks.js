"use strict";

const assert = require("assert");
const defaults = require("./defaults");

class XTasks {
  constructor(namespace, tasks) {
    this._tasks = { [defaults.NAMESPACE]: {} };
    this._namespaces = [defaults.NAMESPACE];
    if (namespace) {
      this.load(namespace, tasks);
    }
  }

  load(namespace, tasks) {
    if (tasks === undefined) {
      tasks = namespace;
      namespace = defaults.NAMESPACE;
    }
    assert(tasks && typeof tasks === "object", "Invalid tasks");
    if (this._tasks[namespace] === undefined) {
      this._tasks[namespace] = {};
      this._namespaces.push(namespace);
    }
    Object.assign(this._tasks[namespace], tasks);
  }

  count() {
    return this._namespaces.reduce((x, ns) => {
      return x + Object.keys(this._tasks[ns]).length;
    }, 0);
  }

  names(ns) {
    return (ns || this._namespaces).reduce((x, ns) => {
      return x.concat(Object.keys(this._tasks[ns]));
    }, []);
  }

  fullNames(ns) {
    return (ns || this._namespaces).reduce((x, ns) => {
      return x.concat(
        Object.keys(this._tasks[ns]).map(t => (ns === ":" ? `:${t}` : `:${ns}:${t}`))
      );
    }, []);
  }

  lookup(name) {
    assert(name, "Invalid empty task name");
    let res = { name };
    // Not start with namespace separator - no namespace
    if (!name.startsWith(defaults.NS_SEP)) {
      res = this._searchNamespaces(name);
    } else {
      const x2 = name.indexOf(defaults.NS_SEP, 1);
      if (x2 > 0) {
        res.ns = name.substring(1, x2);
        assert(res.ns, `Invalid namespace in task name ${name}`);
        res.name = name.substring(x2 + 1);
      } else {
        res.ns = defaults.NAMESPACE;
        res.name = name.substr(1);
      }
      const nsTasks = this._tasks[res.ns];
      assert(nsTasks, `No task namespace ${res.ns} exist`);
      res.item = nsTasks[res.name];
    }
    assert(res.item, `Task ${res.name}${res.ns ? " in namespace " + res.ns : ""} not found`);
    return res;
  }

  _searchNamespaces(name) {
    const ns = this._namespaces;
    for (var i = 0; i < ns.length; i++) {
      const x = this._tasks[ns[i]][name];
      if (x) {
        return { ns: ns[i], name, item: x, search: true };
      }
    }
    return { name };
  }
}

module.exports = XTasks;

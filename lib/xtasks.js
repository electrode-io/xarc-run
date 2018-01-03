"use strict";

const assert = require("assert");
const defaults = require("./defaults");
const NSOrder = require("./ns-order");

class XTasks {
  constructor(namespace, tasks) {
    this._tasks = { [defaults.NAMESPACE]: {} };
    this._nsOrder = new NSOrder();
    if (namespace) {
      this.load(namespace, tasks);
    } else {
      this._namespaces = [defaults.NAMESPACE];
    }
  }

  load(namespace, tasks) {
    let overrides;
    if (tasks === undefined) {
      tasks = namespace;
      namespace = defaults.NAMESPACE;
    } else if (typeof namespace === "object") {
      overrides = namespace.overrides;
      namespace = namespace.namespace;
    }

    assert(tasks && typeof tasks === "object", "Invalid tasks");

    if (this._tasks[namespace] === undefined) {
      this._tasks[namespace] = {};
    }

    if (namespace !== defaults.NAMESPACE) {
      this._nsOrder.add(namespace, overrides);
    }

    this._namespaces = [defaults.NAMESPACE].concat(this._nsOrder._namespaces);

    Object.assign(this._tasks[namespace], tasks);
  }

  count() {
    return this._namespaces.reduce((x, ns) => {
      return x + Object.keys(this._tasks[ns]).length;
    }, 0);
  }

  names(ns) {
    return (ns || this._namespaces).reduce((x, ns) => {
      return x.concat(Object.keys(this._getNsTasks(ns)));
    }, []);
  }

  fullNames(ns) {
    return (ns || this._namespaces).reduce((x, ns) => {
      const nsTasks = this._getNsTasks(ns);
      return x.concat(
        Object.keys(nsTasks).map(
          t =>
            ns === defaults.NAMESPACE ? `${defaults.NS_SEP}${t}` : `${ns}${defaults.NS_SEP}${t}`
        )
      );
    }, []);
  }

  lookup(name) {
    const invalidName = "Empty task name is invalid";
    assert(name, invalidName);
    name = name.trim();

    let optional = false;
    // If there's a prefix ? then the execution is optional
    if (name.startsWith("?")) {
      optional = true;
      name = name.substr(1).trim();
    }
    assert(name, invalidName);
    let res = { name };
    const nsSepIdx = name.indexOf(defaults.NS_SEP);
    // no NS_SEP found
    if (nsSepIdx < 0) {
      res = this._searchNamespaces(name);
    } else {
      if (nsSepIdx === 0) {
        res.ns = defaults.NAMESPACE;
        res.name = name.substr(1);
      } else {
        res.ns = name.substring(0, nsSepIdx).trim();
        assert(res.ns, `Invalid namespace in task name ${name}`);
        res.name = name.substring(nsSepIdx + 1);
      }
      const nsTasks = this._getNsTasks(res.ns);
      assert(res.name, `Empty task name from '${name}' is invalid`);
      res.item = nsTasks[res.name];
    }
    if (!res.item) {
      const opt = optional ? "Optional " : "";
      const err = new Error(
        `${opt}Task ${res.name}${res.ns ? " in namespace " + res.ns : ""} not found`
      );
      err.optional = optional;
      throw err;
    }
    return res;
  }

  _getNsTasks(ns) {
    const x = this._tasks[ns];
    assert(x, `No task namespace ${ns} exist`);
    return x;
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

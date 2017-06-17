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
    assert(name, "Empty task name is invalid");
    name = name.trim();
    assert(name, "Empty task name is invalid");
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
    assert(res.item, `Task ${res.name}${res.ns ? " in namespace " + res.ns : ""} not found`);
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

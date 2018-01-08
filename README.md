[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url] [![devDependency Status][daviddm-dev-image]][daviddm-dev-url]

# xclap

[npm scripts] on steroid - an advanced and flexible JavaScript task executor and build tool.

**xclap** can load and execute your [npm scripts] with auto completion for [bash] and [zsh]. It also allows you to define tasks in a JavaScript file, with support for advanced features such as namespace, serial and concurrent tasks execution, and proper nesting task execution hierarchy.

## Features

* **_Support [namespaces](./REFERENCE.md#namespace) for tasks._**
* Load and execute npm scripts from `package.json`.
* Auto completion for [bash] and [zsh].
* Define tasks in a JavaScript file.
* Serial tasks execution.
* Concurrent tasks execution.
* Proper nesting task execution hierarchy.
* Promise or callback support for tasks written in JavaScript.
* Support custom task execution reporter.
* Specify complex tasks execution pattern from command line.

## Getting Started

### Install

```bash
$ npm install xclap --save-dev
```

If you'd like to get the command `clap` globally, you can install another small npm module [xclap-cli] globally.

```bash
$ npm install -g xclap-cli
```

### A Quick Tasks Example

You can define your tasks in a JavaScript file, allowing you do anything that's possible with JS.

Here is a simple sample. Save it to `xclap.js` and xclap will automatically load it.

```js
const xclap = require("xclap");
const tasks = {
  hello: "echo hello world",
  js: () => console.log("JS hello world"),
  both: {
    desc: "invoke tasks hello and js in serial order",
    task: ["hello", "js"]
  }
};
xclap.load(tasks);
```

Then invoke the task:

```bash
$ clap hello
hello world
$ clap both
hello world
JS hello world
```

> You can call the file `clapfile.js` or `clap.js` if you prefer, but `xclap.js` is used if it exists.

### Usage

Any task can be invoked with the command `clap`:

```bash
$ clap task1 [task1 options] [<task2> ... <taskN>]
```

ie:

```bash
$ clap build
```

For help on usage:

```bash
$ clap -h
```

To load [npm scripts] into the `npm` namespace, use the `-n` option:

```bash
$ clap -n test
```

You can also specify command line options under `xclap` in your `package.json`.

#### Specifying Complex Tasks from command line

You can specify your tasks as an array from the command line.

For example, to have `xclap` execute the tasks `[ task_a, task_b ]` concurrently:

```bash
$ clap [ task_a, task_b ]
```

You can also execute them serially with:

```bash
$ clap -x [ task_a, task_b ]
```

You can execute tasks serially, and then some tasks concurrently:

```bash
$ clap -x [task_a, task_b, [task_c1, task_c2]]
```

> will execute `task_a`, then `task_b`, and finally `task_c1` and `task_c2` concurrently.

You can pass the whole array in as a single string, which will be parsed as an array with string elements only.

```bash
$ clap "[task_a, task_b, [task_c1, task_c2]]"
```

#### Task Name

Task name is any alphanumeric string that does not contain `/`, or starts with `?` or `~$`.

Tasks can be invoked from command line:

* `xclap foo/task1` indicates to execute `task1` in namespace `foo`
* `xclap ?task1` or `xclap ?foo/task1` indicates that executing `task1` is optional.

`xclap` treats these characters as special:

* `/` as namespace separator
* prefix `?` to let you indicate that the execution of a task is optional so it won't fail if the task is not found.
* prefix `~$` to indicate the task to be a string as a shell command

#### Optional Task Execution

By prefixing the task name with `?` when invoking, you can indicate the execution of an task as optional so it won't fail in case the task is not found.

For example:

* `xclap ?foo/task1` or `xclap ?task1` won't fail if `task1` is not found.

#### Task Definition

A task can be `string`, `array`, `function`, or `object`. See [reference](./REFERENCE.md#task-definition) for details.

### package.json

You can define xclap tasks and options in your `package.json`.

#### Tasks

You can also define **xclap** tasks without JavaScript capability in an object `xclap.tasks` in your `package.json`.

They will be loaded into a namespace `pkg`.

For example:

```js
{
  "name": "my-app",
  "xclap": {
    "tasks": {
      "task1": "echo hello from package.json",
      "task2": "echo hello from package.json",
      "foo": ["task1", "task2"]
    }
  }
}
```

And you can invoke them with `clap pkg/foo`, or `clap foo` if there are no other namespace with a task named `foo`.

#### Options

xclap command line options can also be specified in `xclap` inside your `package.json`.

For example:

```js
{
  "name": "my-app",
  "xclap": {
    "npm": true
  }
}
```

### npm scripts

If you specify the `--npm` option then all npm scripts in your `package.json` are loaded into the namespace `npm`.

You can enable this by default by setting the option in your `package.json` also.

> xclap does not handle [npm scripts] lifecyle rules so `clap test` will only execute `test` and no `pretest` or `posttest`.

### Async Tasks

You can provide a JS function for a task that executes asynchrounously. Your function just need to take a callback or return a Promise.

ie:

```js
const tasks = {
  cb_async: (cb) => {
    setTimeout(cb, 10);
  },
  promise_async: () => {
    return new Promise(resolve => {
      setTimeout(resolve, 10);
    }
  }
}
```

### Detailed Reference

See [reference](./REFERENCE.md) for more detailed information on features such as [load tasks into namespace], and setup [auto complete with namespace] for your shell.

[travis-image]: https://travis-ci.org/jchip/xclap.svg?branch=master
[travis-url]: https://travis-ci.org/jchip/xclap
[npm-image]: https://badge.fury.io/js/xclap.svg
[npm-url]: https://npmjs.org/package/xclap
[daviddm-image]: https://david-dm.org/jchip/xclap/status.svg
[daviddm-url]: https://david-dm.org/jchip/xclap
[daviddm-dev-image]: https://david-dm.org/jchip/xclap/dev-status.svg
[daviddm-dev-url]: https://david-dm.org/jchip/xclap?type=dev
[npm scripts]: https://docs.npmjs.com/misc/scripts
[xclap-cli]: https://github.com/jchip/xclap-cli
[bash]: https://www.gnu.org/software/bash/
[zsh]: http://www.zsh.org/

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url] [![devDependency Status][daviddm-dev-image]][daviddm-dev-url]

# xclap

[npm scripts] on steroid - an advanced and flexible JavaScript task executor and build tool.

**xclap** can load and execute your [npm scripts] with auto completion for [bash] and [zsh].  It also allows you to define tasks in a JavaScript file, with support for advanced features such as namespace, serial and concurrent tasks execution, and proper nesting task execution hierarchy.

## Features

-   **_Support [namespaces](#namespace) for tasks!!!_**.
-   Load and execute npm scripts from `package.json`.
-   Auto completion for [bash] and [zsh].
-   Define tasks in a JavaScript file.
-   Serial tasks execution.
-   Concurrent tasks execution.
-   Proper nesting task execution hierarchy.
-   Promise or callback support for tasks written in JavaScript.
-   Support custom task execution reporter.
-   Specify complex tasks execution pattern from command line.

## Getting Started

### Install

```bash
$ npm install xclap --save-dev
```

If you'd like to get the command `clap` globally, you can install another small npm module [xclap-cli] globally.

```bash
$ npm install -g xclap-cli
```

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

You can pass the whole array in as a single string:

```bash
$ clap "[task_a, task_b]"
```

You can execute tasks serially, and then some tasks concurrently:

```bash
$ clap -x [task_a, task_b, [task_c1, task_c2]]
```

> will execute `task_a`, then `task_b`, and finally `task_c1` and `task_c2` concurrently.

### Simple JavaScript Task Definitions

You can define your tasks in a JavaScript file, allowing you do anything that's possible with JS.

Here is a simple sample.  Save it to `xclap.js` and xclap will automatically load it.

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
>
> You can also define **xclap** tasks without JavaScript capability in an object `xclap.tasks` in your `package.json`.

### Async Tasks

You can provide a JS function for a task that executes asynchrounously.  Your function just need to take a callback or return a Promise.

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

### Namespace

A group of tasks can be assigned a namespace and allows you to have tasks with the same name so you can modify certain tasks without replacing them.

For example:

```js
xclap.load([namepsace], tasks)
```

You refer to the namespaces with `/`, ie: `ns/foo`.

Anything that was loaded without a namespace is assigned to the default namespace `/`, which can be accessed with a simple leading `/`, ie: `/foo`.

If you run a task without specifying the namespace, then it's searched through all namespaces until it's found.  The default namespace is the first one to search.  The search is done in the order the namespaces were loaded.

> For obvious reasons, this means task names cannot contain `/`.

#### Auto Complete with namespace

To assist auto completion when using [xclap-cli], you may specify all namespaces with a leading `/` when invoking from the command line.  It will be stripped before xclap run them.

ie:

```bash
$ clap /foo/bar
```

That way, you can press `tab` after the first `/` to get auto completion with namespaces.

### Detailed Reference

See [reference](./REFERENCE.md) for more detailed information.

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

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url] [![devDependency Status][daviddm-dev-image]][daviddm-dev-url]

# xclap

An advanced and flexible JavaScript task executor.

## Features

-   **_Support [namespaces](#namespace) for tasks!!!_**
-   Serial tasks execution
-   Concurrent tasks execution
-   Proper tasks nesting hierarchy
-   Promise or callback support
-   Load and execute npm scripts from `package.json`
-   Support custom task execution reporter

The namespace feature allows you to have tasks with the same name so you can modify certain tasks without replacing them.

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

### Simple Task Definitions

Save this to `xclap.js`

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

A group of tasks can be assigned a namespace.

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

[xclap-cli]: https://github.com/jchip/xclap-cli

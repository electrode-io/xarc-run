---
id: xclap
title: xclap
license: Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
---

[![NPM version][npm-image]][npm-url]
[![Build Status][ci-shield]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![devDependency Status][daviddm-dev-image]][daviddm-dev-url]

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About xclap](#about-xclap)
- [xclap Quick start](#xclap-quick-start)
  - [Install xclap](#install-xclap)
- [Invoke xclap](#invoke-xclap)
  - [Native commands](#native-commands)
  - [`clap`](#clap)
- [Tasks](#tasks)
  - [Asynchronous Tasks](#asynchronous-tasks)
- [xclap sample](#xclap-sample)
  - [Advanced sample](#advanced-sample)
  - [String arrays](#string-arrays)
  - [Naming conventions](#naming-conventions)
    - [Special characters](#special-characters)
  - [Environment Variables](#environment-variables)
    - [bash example (non-Win)](#bash-example-non-win)
    - [Multi-platform](#multi-platform)
  - [Testing](#testing)
  - [TypeScript support](#typescript-support)
  - [Help](#help)
- [Reference](#reference)

## About xclap

xclap is an advanced version of [npm-scripts] which provides more flexibility for JavaScript tasks and a more robust build tool.

- Write complex build steps with flow controls like `dependent` and `finally` hooks with serial or concurrent executions
- [namespaces](./REFERENCE.md#namespace) - allows users overload certain tasks while still referencing them
- Tasks can have a [_finally hook_](./REFERENCE.md#finally-hook) which runs after task success or failure
- Promise [node.js stream], or callback support for common JS tasks
- Supports [flexible function task](./REFERENCE.md#function) to return more tasks to run
- Execute `npm scripts` concurrently or serially using JS
- Load and execute npm scripts from `package.json`
- Shell command builds using Advanced JavaScript
- Run time flow control (return additional tasks)
- Proper nesting of task execution hierarchy
- Terminal/Command-line task execution
- Auto-completion for [bash] and [zsh]
- Custom task execution reporter
- Define tasks in a JavaScript file
- Run serial or concurrent tasks

 While [npm scripts] allows for simple build scripts, there are some limitations:

- JSON single string file may not be enough for a production build script
- No stream support, flow control, or extending/customization
- JavaScript is the _only_ script option at times
- Requires cross-platform scripting

xclap picks up where [npm scripts] leaves off, and is best utilized for writing reusable build scripts via shell/JS.

## xclap Quick start

### Install xclap

```bash
npm install xclap --save-dev
```

To enable clap command line tools, run [xclap-cli] globally.

```bash
npm install -g xclap-cli
```

- See also: [xclap sample](#xclap-sample) and [Advanced sample](#advanced-sample) below

## Invoke xclap

You can specify your tasks as an array from the command line.

For example, to have `xclap` execute the tasks `[ task_a, task_b ]`

```bash
// concurrent execution

clap [ task_a, task_b ]
```

```bash
// serial execution

clap -x [ task_a, task_b ]
```

```bash
// Hybrid - serial/concurrent execution

clap -x [task_a, task_b, [task_c1, task_c2]]
```

- This command will execute `task_a`, then `task_b` (serially)
- then
- `task_c1` and `task_c2` (concurrently)

### Native commands

### `clap`

Any task can be invoked by running `clap`

`clap task1 [task1 options] [<task2> ... <taskN>]`

`clap build`

You can also specify command line options under `xclap` in your `package.json`:

```js
{
  "name": "my-app",
  "xclap": {
    "npm": true
  }
}
```

## Tasks

xclap tasks may be `string`, `array`, `function`, or `object`. See [reference](./REFERENCE.md#task-definition) for more details.

### Asynchronous Tasks

You can provide a JS function for asynchronous tasks. Your function needs to accept a callback, return a Promise, or a [node.js stream].

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

## xclap sample

You can define your tasks in a JavaScript file.

To see this in action, save the following sample to `xclap.js` and xclap will automatically load it:

```js
"use strict";
const xclap = require("xclap");

const tasks = {
  hello: "echo hello world", // shell command to be executed
  jsFunc() {
    console.log("JS hello world");
  },
  both: ["hello", "jsFun"] // execute tasks serially
};

// Load tasks into xclap
xclap.load(tasks);
```

Then init an npm project and save the file to disk as `xclap.js`:

```bash
npm init --yes
npm install rimraf xclap
npm install -g xclap-cli
```

And try one of these commands:

- `clap hello` - invoke task "hello"
- `clap jsFunc` - invoke task "jsFunc"
- `clap both` - invoke task "both`
- `clap hello jsFunc` - runs "hello` and "jsFunc" concurrently
- `clap -x hello jsFunc` - runs "hello" and "jsFunc" serially

### Advanced sample

```js
"use strict";

const util = require("util");
const xclap = require("xclap");
const { exec, concurrent, serial, env } = xclap;
const rimraf = util.promisify(require("rimraf"));

const tasks = {
  hello: "echo hello world",
  jsFunc() {
    console.log("JS hello world");
  },
  both: {
    desc: "invoke tasks hello and jsFunc in serial order",
    // only array at top level like this is default to serial, other times
    // they are default to concurrent, or they can be marked explicitly
    // with the serial and concurrent APIs (below).
    task: ["hello", "jsFunc"]
  },
  // invoke tasks hello and jsFunc concurrently as a simple concurrent array
  both2: concurrent("hello", "jsFunc"),
  shell: {
    desc: "Run a shell command with TTY control and set an env",
    task: exec({ cmd: "echo test", flags: "tty", env: { foo: "bar" } })
  },
  babel: exec("babel src -D lib"),
  // serial array of two tasks, first one to set env, second to invoke the babel task.
  compile: serial(env({ BABEL_ENV: "production" }), "babel"),
  // more complex nesting serial/concurrent tasks.
  build: {
    desc: "Run production build",
    task: serial(
      () => rimraf("dist"), // cleanup, (returning a promise will be awaited)
      env({ NODE_ENV: "production" }), // set env
      concurrent("babel", exec("webpack")) // invoke babel task and run webpack concurrently
    )
  }
};

xclap.load(tasks);
```

### String arrays

You can pass the whole array in a single string, which will be parsed as an array with string elements only.

```bash
clap "[task_a, task_b, [task_c1, task_c2]]"
```

### Naming conventions

An alphanumeric string that does not contain `/`, or starts with `?` or `~$`.

Tasks may be invoked from command line:

- `xclap foo/task1`
  - will execute `task1` in namespace `foo`

- `xclap ?task1` or `xclap ?foo/task1`
  - where execution of `task1` is optional.

#### Special characters

`xclap` treats these characters as special:

- `/` - namespace separator
- prefix `~$` - task is a shell command string
- prefix `?` - optional: will NOT fail if the task is not found.
  - Example: `xclap ?foo/task1` or `xclap ?task1` will succeed even if `task1` is not found.

### Environment Variables

#### bash example (non-Win)

```js
{
  "scripts": {
    "prod-build": "NODE_ENV=production npm run build",
    "build": "webpack",
    "compile": "BABEL_ENV=production babel src -D lib"
  }
}
```

#### Multi-platform

```js
const xclap = require("xclap");
const { env, exec } = xclap;

const tasks = {
  "prod-build": [env({ NODE_ENV: "production" }), "build"],
  build: "webpack",
  compile: exec("babel src -D lib", { env: { BABEL_ENV: "production" } })
};

xclap.load(tasks);
```

### Testing

To load [npm scripts] into the `npm` namespace, use the `-n` option:

```bash
clap -n test
```

### TypeScript support

To use TypeScript:

1. Name your task file with the `ts` file extension e.g. `xclap.ts`
2. You also need to install [ts-node](https://www.npmjs.com/package/ts-node) to your `node_modules`
3. run:

```js
run npm install -D ts-node typescript
```

xclap will automatically load `ts-node/register` when it detects the `xclap.ts` file.

### Help

```bash
clap -h
```

## Reference

See [reference](./REFERENCE.md) for more detailed information on features such as [load tasks into namespace], and setup [auto complete with namespace] for your shell.

[ci-shield]: https://travis-ci.org/electrode-io/xclap.svg?branch=master
[ci-url]: https://travis-ci.org/electrode-io/xclap
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
[load tasks into namespace]: REFERENCE.md#loading-task
[auto complete with namespace]: REFERENCE.md#auto-complete-with-namespace
[npm]: https://www.npmjs.com/package/npm
[node.js stream]: https://nodejs.org/api/stream.html

[![NPM version][npm-image]][npm-url] [![Build Status][ci-shield]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url] [![devDependency Status][daviddm-dev-image]][daviddm-dev-url]

# xclap

[npm scripts] on steroid - an advanced and flexible JavaScript task executor and build tool.

- Run `npm scripts` concurrently or serially
- Extend `npm scripts` with JavaScript
- namespace support and more

## Running [npm scripts]

You can use xclap to run all your [npm scripts] in `package.json`.

And you can run multiple of them **concurrently** or **serially**.

Some examples below:

| what you want to do                 | npm command    | xclap command                   |
| ----------------------------------- | -------------- | ------------------------------- |
| run `test`                          | `npm run test` | `clap --npm test`               |
| run `lint` and then `test` serially | N/A            | `clap --npm --serial lint test` |
| run `lint` and `test` concurrently  | N/A            | `clap --npm lint test`          |

## Running JavaScript tasks

You can write your tasks in JavaScript and run them with xclap.

> This is useful when a shell script is too long to fit in a JSON string, or when it's not easy to do something with shell script.

xclap provides these APIs: `concurrent`, `serial`, `exec`, `env`, and `load`.

Put your tasks in a file `xclap.js` and xclap will load it automatically.

An example `xclap.js`:

```js
const { load, exec, concurrent, serial } = require("xclap");
load({
  //
  // define a task hello, with a string definition
  // because a string is the task's direct value, it will be executed as a shell command.
  //
  hello: "echo hello",
  //
  // define a task world, using a JavaScript function to print something
  //
  world: () => console.log("world"),
  //
  // define a task serialTask, that will execute the three tasks serially, first two are
  // the hello and world tasks defined above, and 3rd one is a shell command defined with exec.
  // because the 3rd one is not a direct value of a task, it has to use exec to define a shell command.
  //
  serialTask: serial("hello", "world", exec("echo hi from exec")),
  //
  // define a task concurrentTask, that will execute the three tasks concurrently
  //
  concurrentTask: concurrent("hello", "world", exec("echo hi from exec")),
  //
  // define a task nesting, that does complex nesting of concurrent/serial constructs
  //
  nesting: concurrent(serial("hello", "world"), serial("serialTask", concurrent("hello", "world")))
});
```

To run the tasks defined above from the command prompt, below are some examples:

| task                                  | command                     |
| ------------------------------------- | --------------------------- |
| run `hello`                           | `clap hello`                |
| run `hello` and then `world` serially | `clap --serial hello world` |
| run `hello` and `world` concurrently  | `clap hello world`          |

### `exec` and shell scripts

Use `exec` to invoke a shell command from JavaScript.

Here are some examples:

| shell script in JSON string | shell script using `exec` in JavaScript          | note                         |
| --------------------------- | ------------------------------------------------ | ---------------------------- |
| `echo hello`                | `exec("echo hello")`                             |                              |
| `FOO=bar echo hello $FOO`   | `exec("FOO=bar echo hello $FOO")`                |                              |
| `echo hello && echo world`  | `exec("echo hello && echo world")`               |                              |
| `echo hello && echo world`  | `serial(exec("echo hello"), exec("echo world"))` | using serial instead of `&&` |

- `exec` supports `options` that can set a few things. Some examples below:

| what you want to do                   | shell script using `exec` in JavaScript                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| setting env                           | `exec("echo hello $FOO", {env: {FOO: "bar"}})`                     |
| provide tty                           | `exec("echo hello", {flags: "tty"})`                               |
| using spawn with tty, and setting env | `exec("echo hello $FOO", {flags: "tty,spawn", env: {FOO: "bar"}})` |

### Function tasks

A task in JavaScript can be just a function.

```js
load({
  hello: () => console.log("hello")
});
```

A function task can do a few things:

- Return a promise or be an async function, and xclap will wait for the Promise.
- Return a stream and xclap will wait for the stream to end.
- Return another task for xclap to execute further.
- Access arguments passed to the task with `this.args` (for non-fat-arrow functions only)

`this.args` example:

```js
load({
  // A function task named hello that access arguments with `this.args`
  // It must not be a fat arrow function to access `this.args`
  hello() {
    console.log("hello args:", this.args);
    return ["foo"];
  },
  h2: ["hello world"],
  foo: "echo bar"
});
```

### Running tasks with `concurrent` and `serial`

Use `concurrent` and `serial` to define a task that run multiple other tasks **concurrently** or **serially**.

Some examples:

- To do the same thing as the shell script `echo hello && echo world`:

```js
serial(exec("echo hello"), exec("echo world"));
```

- or concurrently:

```js
concurrent(exec("echo hello"), exec("echo world"));
```

- You can specify any valid tasks:

```js
serial(
  exec("echo hello"),
  () => console.log("world"),
  "name-of-a-task",
  concurrent("task1", "task2")
);
```

### Tasks to set `process.env`

`env` allows you to create a task to set variables in `process.env`.

You use it by passing an object of env vars, like `env({VAR_NAME: "var-value"})`

Examples:

```js
load({
  setEnv: serial(env({ FOO: "bar" }), () => console.log(process.env.FOO))
});
```

### And to put it all together

A popular CI/CD use case is to start servers and then run tests, which can be achieved using xclap JavaScript tasks:

```js
const { concurrent, serial, load, stop } = require("xclap");
const waitOn = require("wait-on");

const waitUrl = url => waitOn({ resources: [url] });

load({
  "start-server-and-test": concurrent(
    // start the servers concurrently
    concurrent("start-mock-server", "start-app-server"),
    serial(
      // wait for servers concurrently, and then run tests
      concurrent("wait-mock-server", "wait-app-server"),
      "run-tests",
      // Finally stop servers and exit.
      // This is only needed because there are long running servers.
      () => stop()
    )
  ),
  "start-mock-server": "mock-server",
  "start-app-server": "node lib/server",
  "wait-mock-server": () => waitUrl("http://localhost:8000"),
  "wait-app-server": () => waitUrl("http://localhost:3000"),
  "run-tests": "cypress run --headless -b chrome"
});
```

> xclap adds `node_modules/.bin` to PATH. That's why `npx` is not needed to run commands like `cypress` that's installed in `node_modules`.

### Shorthands

Not a fan of full API names like `concurrent`, `serial`, `exec`? You can skip them.

- `concurrent`: Any array of tasks are concurrent, except when they are specified at the top level.
- `exec`: Any string starting with `~$` are treated as shell script.
- `serial`: An array of tasks specified at the top level is executed serially.

Example:

```js
load({
  executeSerially: ["task1", "task2"], // top level array serially
  concurrentArray: [["task1", "task2"]], // Any other array (the one within) are concurrent
  topLevelShell: "echo hello", // top level string is a shell script
  shellScripts: [
    "~$echo hello", // any string started with ~$ is shell script
    "~(tty,spawn)$echo hello" // also possible to specify tty and spawn flag between ~ and $
  ]
});
```

## Full List of Features

- **_Support [namespaces](./REFERENCE.md#namespace) for tasks._**
- Load and execute npm scripts from `package.json`.
- Auto completion for [bash] and [zsh].
- Define tasks in a JavaScript file.
- Serial tasks execution.
- Concurrent tasks execution.
- Proper nesting task execution hierarchy.
- Promise, [node.js stream], or callback support for tasks written in JavaScript.
- Run time flow control - return further tasks to execute from JS task function.
- Support custom task execution reporter.
- Specify complex tasks execution pattern from command line.
- Tasks can have a [_finally_](./REFERENCE.md#finally-hook) hook that always runs after task finish or fail.
- Support [flexible function task](./REFERENCE.md#function) that can return more tasks to run.

## Getting Started

Still reading? OK, maybe you want to take it for a test drive?

## A Simple Example

Here is a simple sample.

1. First setup the directory and project:

```bash
mkdir xclap-test
cd xclap-test
npm init --yes
npm install rimraf xclap
npm install -g xclap-cli
```

2. Save the following code to `xclap.js`:

```js
"use strict";
const { load } = require("xclap");

const tasks = {
  hello: "echo hello world", // a shell command to be exec'ed
  jsFunc() {
    console.log("JS hello world");
  },
  both: ["hello", "jsFun"] // execute the two tasks serially
};

// Load the tasks into xclap
load(tasks);
```

3. And try one of these commands:

| what to do                            | command                      |
| ------------------------------------- | ---------------------------- |
| run the task `hello`                  | `clap hello`                 |
| run the task `jsFunc`                 | `clap jsFunc`                |
| run the task `both`                   | `clap both`                  |
| run `hello` and `jsFunc` concurrently | `clap hello jsFunc`          |
| run `hello` and `jsFunc` serially     | `clap --serial hello jsFunc` |

## A More Complex Example

Here is a more complex example to showcase a few more features:

```js
"use strict";

const util = require("util");
const { exec, concurrent, serial, env, load } = require("xclap");
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

load(tasks);
```

## Global `clap` command

If you'd like to get the command `clap` globally, so you don't have to type `npx clap`, you can install another small npm module [xclap-cli] globally.

```bash
$ npm install -g xclap-cli
```

## TypeScript

Name your task file `xclap.ts` if you want to use TypeScript.

You also need to install [ts-node](https://www.npmjs.com/package/ts-node) to your `node_modules`

ie:

```bash
npm install -D ts-node typescript
```

xclap automatically loads `ts-node/register` when it detects `xclap.ts` file.

## Command Line Usage

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

To load [npm scripts] into the `npm` namespace, use the `--npm` option:

```bash
$ clap --npm test
```

You can also specify command line options under `xclap` in your `package.json`.

### Specifying Complex Tasks from command line

You can specify your tasks as an array from the command line.

For example, to have `xclap` execute the tasks `[ task_a, task_b ]` concurrently:

```bash
$ clap [ task_a, task_b ]
```

You can also execute them serially with:

```bash
$ clap --serial [ task_a, task_b ]
```

You can execute tasks serially, and then some tasks concurrently:

```bash
$ clap --serial [task_a, task_b, [task_c1, task_c2]]
```

> will execute `task_a`, then `task_b`, and finally `task_c1` and `task_c2` concurrently.

You can pass the whole array in as a single string, which will be parsed as an array with string elements only.

```bash
$ clap "[task_a, task_b, [task_c1, task_c2]]"
```

## Task Name

Task name is any alphanumeric string that does not contain `/`, or starts with `?` or `~$`.

Tasks can be invoked from command line:

- `xclap foo/task1` indicates to execute `task1` in namespace `foo`
- `xclap ?task1` or `xclap ?foo/task1` indicates that executing `task1` is optional.

`xclap` treats these characters as special:

- `/` as namespace separator
- prefix `?` to let you indicate that the execution of a task is optional so it won't fail if the task is not found.
- prefix `~$` to indicate the task to be a string as a shell command

## Optional Task Execution

By prefixing the task name with `?` when invoking, you can indicate the execution of a task as optional so it won't fail in case the task is not found.

For example:

- `xclap ?foo/task1` or `xclap ?task1` won't fail if `task1` is not found.

## Task Definition

A task can be `string`, `array`, `function`, or `object`. See [reference](./REFERENCE.md#task-definition) for details.

## package.json

You can define xclap tasks and options in your `package.json`.

## Tasks

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

## Options

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

## Async Tasks

You can provide a JS function for a task that executes asynchronously. Your function just need to take a callback or return a Promise or a [node.js stream].

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

## Detailed Reference

See [reference](./REFERENCE.md) for more detailed information on features such as [load tasks into namespace], and setup [auto complete with namespace] for your shell.

## License

Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)

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

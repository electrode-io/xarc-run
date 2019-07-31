# Detail Reference

- [Creating Tasks](#creating-tasks)
- [Loading Task](#loading-task)
- [Task Definition](#task-definition)
  - [Direct Action Task](#direct-action-task)
  - [A Task Object](#a-task-object)
  - [String](#string)
    - [String Array](#string-array)
  - [Array](#array)
    - [Anonymous String Shell Command](#anonymous-string-shell-command)
      - [Shell Task Flags](#shell-task-flags)
  - [Function](#function)
  - [Task Spec](#task-spec)
  - [Object](#object)
    - [finally hook](#finally-hook)
- [Array serial/concurrent rules](#array-serialconcurrent-rules)
  - [Serially](#serially)
    - [Using serial API](#using-serial-api)
    - [top level](#top-level)
    - [First element dot](#first-element-dot)
    - [Concurrently](#concurrently)
  - [Namespace](#namespace)
    - [Auto Complete with namespace](#auto-complete-with-namespace)
- [Execution Context](#execution-context)
  - [Task Options](#task-options)
    - [Inline Task Options](#inline-task-options)

* [APIs](#apis)
  - [`stopOnError`](#stoponerror)
  - [`load([namespace], tasks)`](#loadnamespace-tasks)
  - [`run(name, [done])`](#runname-done)
  - [`waitAllPending(done)`](#waitallpendingdone)
  - [`env(spec)`](#envspec)
  - [`concurrent([tasks]|task1, task2, taskN)`](#concurrenttaskstask1-task2-taskn)
  - [`serial([tasks]|task1, task2, taskN)`](#serialtaskstask1-task2-taskn)
  - [`exec(spec)`](#execspec)

## Creating Tasks

Tasks is defined in an object, for example:

```js
const tasks = {
  xfoo1: `echo "a direct shell command xfoo1"`,
  xfoo2: `echo "a direct shell command xfoo2"`,
  xfoo3: `echo "a direct shell command xfoo3"`,
  xfoo4: () => console.log("hello, this is xfoo4"),
  foo2: ["xfoo1", "xfoo2", "xfoo3", "xfoo4"],
  foo3: {
    desc: "description for task foo3",
    task: () => {
      console.log("function task for foo3");
    }
  }
};
```

## Loading Task

Tasks can be loaded with `xclap.load`. You can specify a namespace for the tasks.

```js
const xclap = require("xclap");
xclap.load(tasks);
// or load into a namespace
xclap.load("myapp", tasks);
```

## Task Definition

### Direct Action Task

Ultimately, a task would eventually resolve to some kind of runnable action that's either a function, a shell string, or a list of other tasks to run.

A task can define its direct action as one of:

- [A string](#string) - as a shell command to be spawned, or as a [string that contains an array](#string-array)
- [An array](#array) - list of tasks to be processed and execute [serially](#serially) or [concurrently](#concurrently).
- [A function](#function) - to be called, which can return more tasks to execute.
- [Task Spec](#task-spec) - created using the [exec API](#execspeccmd-flagsoptions), as a shell command to run.

### A Task Object

To allow decorating a task with more information such as name and description, the task definition can be an [An object](#object), which should contain a `task` field that defines a [direct action task](#direct-action-task).

### String

- A string primarily is executed as a shell command.
- A string [started with `"~["`](#string-array) is parsed into an [array task](#array).

```js
{
  foo: "echo hello";
}
```

`clap foo` will cause the shell command `echo hello` to be spawned.

This two environment variables are defined, mainly for the [`finally`](#finally-hook) hook.

- `XCLAP_ERR` - If task failed, this would contain the error message.
- `XCLAP_FAILED` - If any task failed, this would be `true`.

#### String Array

If a string task starts with `"~["` then it's parsed as an array with string elements and executed as [array task](#array).

For example:

```js
{
  foo: "~[ foo1, foo2, foo3 ]";
}
```

Will be the same as specifying `foo: [ "foo1", "foo2", "foo3" ]` and processed as [array task](#array).

### Array

If the task is an array, then it can contain elements that are strings or functions.

- Functions are treat as a [task function](#function) to be called.
- Strings in a task array are primarily treated as name of another task to look up and execute.
- String started with `"~$"` are treated as [anonymous shell commands](#task-name-as-anonymous-shell-command) to be executed.

The [array serial/concurrent rules](#array-serialconcurrent-rules) will be applied.

```js
{
  foo: ["foo1", "foo2", "foo3"];
}
```

`clap foo` will cause the three tasks `foo1`, `foo2`, `foo3` to be executed **_serially_**.

#### Anonymous String Shell Command

If the task name in a task array starts with `"~$"` then the rest of it is executed as an anonymous shell command directly.

For example:

```js
{
  foo: ["foo1", "~$echo hello"];
}
```

Will cause the task `foo1` to be executed and then the shell command `echo hello` to be executed.

##### Shell Task Flags

Any string that's to be a shell command can have flags like this:

```js
{
  foo: `~(tty)$node -e "console.log('isTTY', process.stdout.isTTY)"`;
}
```

- The leading part `~(tty)$` is specifying a shell command with flags `(tty)`.
- Multiple flags can be specified like this: `~(tty,sync)$`.

These are supported flags:

- `tty` - Use [child_process.spawn] to launch the shell command with TTY control. **WARNING** Only one task at a time can take over the TTY.
- `spawn` - Use [child_process.spawn] API instead of [child_process.exec] to launch the shell process. TTY control is not given.
- `sync` - If either `tty` or `spawn` flag exist, then use [child_process.spawnSync] API. This will cause concurrent tasks to wait.
- `noenv` - Do not pass `process.env` to child process.

### Function

```js
{
  foo: function (callback) { return Promise.resolve("hello"); }
}
```

`clap foo` will cause the function to be called.

The `this` context for the function will the clap [Execution Context](#execution-context). If you don't want to use `this`, then you can use fat arrow function for your task.

The function can return:

- `Promise` - `clap` will await for the promise.
- [node.js stream] - `clap` will wait for the stream to end.
- `array` - `clap` will treat the array as a list of tasks to be executed
  - The [array serial/concurrent rules](#array-serialconcurrent-rules) applied to the array.
  - The [anonymous shell command](#task-name-as-anonymous-shell-command) rule applied to each string element.
- `string` - `clap` will treat the string as a task name or an [anonymous shell command to executed](#task-name-as-anonymous-shell-command).
- `function` - `clap` will call the function as another task function.
- `stream` - [TBD]
- `undefined` or anything else - `clap` will wait for the `callback` to be called.

### Task Spec

A direct action task can also be defined as a task spec.

Right now the support spec type is for running a shell command, created using the [exec API](#execspeccmd-flagsoptions)

This is a more systematic approach to declare an [anonymous string shell command](#anonymous-string-shell-command).

A task spec shell command can be declared as the task or a task in the array:

```js
const xclap = require("xclap");

const tasks = {
  hello: xclap.exec("echo hello"),
  foo: [xclap.exec("echo foo"), xclap.exec("echo bar")]
};

xclap.load(tasks);
```

### Object

You can define your task as an object in order to specify more information.

For example:

```js
{
  task1: {
    desc: "description",
    task: <task-definition>,
    dep: <task-definition>,
    finally: <finally-hook-definition>
  }
}
```

Where:

- `desc` - Description for the task.
- `task` - Defines a [direct action task](#direct-action-task).
- `dep` - Dependency tasks to be executed first.
- `finally` - Defines a [direct action task](#direct-action-task) that's always run after task finish or fail.

#### finally hook

When defining task as an object, you can have a `finally` property that defines [direct action task](#direct-action-task) which is always executed after the task completes or fails. Generally for doing clean up chores.

Note that the finally hook is processed the same way as a task. Other tasks that are referenced by the `finally` hook will not have their `finally` hook invoked.

If you set `stopOnError` to `full`, then be careful if you have concurrent running tasks, because `full` stop immediately abandon all pending async sub tasks, but since xclap can't reliably cancel them, they could be continuing to run, and therefore could cause concurrent conflict with your finally hook.

If you have async task, it's best you set [`stopOnError`](#stoponerror) to `soft`.

## Array serial/concurrent rules

When you define a task as an array, it should contain a list of task names to be executed serially or concurrently.

Generally, the array of tasks is executed concurrently, and only serially when [certain conditions](#serially) are true.

An task array can also be explicitly created as concurrent using the [concurrent API](#concurrenttaskstask1-task2-taskn)

### Serially

Each task in the array is executed serially if one of the following is true:

- The array is defined at the [top level](#top-level).
- The array is created by the [serial API](#serialtaskstask1-task2-taskn).
- The first element of the array is [`"."`](#first-element-dot) **DEPRECATED** use the [serial API](#serialtaskstask1-task2-taskn) instead.

#### Using serial API

Create an array of serial tasks within another concurrent array:

```js
const xclap = require("xclap");

const tasks = {
  foo: xclap.concurrent("a", xclap.serial("foo1", "foo2", "foo3"))
};

xclap.load(tasks);
```

#### top level

At top level, an array of task names will be executed serially.

```js
const tasks = {
  foo: ["foo1", "foo2", "foo3"];
};

xclap.load(tasks);
```

#### First element dot

> **DEPRECATED** - Please use the [serial API](serialtaskstask1-task2-taskn) instead.

If the first element of the array is `"."` then the rest of tasks in the array will be executed serially.

```js
{
  foo: ["bar", [".", "foo1", "foo2", "foo3"]];
}
```

#### Concurrently

By default, an ordinary array of tasks is executed concurrently, except when it's defined at the [top level](#top-level)

If you need to have an array of tasks at the top level to execute concurrently, use the [concurrent API](concurrenttaskstask1-task2-taskn) to create it.

```js
const xclap = require("xclap");

const tasks = {
  foo: xclap.concurrent("foo1", "foo2", "foo3");
};

xclap.load(tasks);
```

> `clap foo` will execute tasks `foo1`, `foo2`, and `foo3` **_concurrently_**.

### Namespace

A group of tasks can be assigned a namespace and allows you to have tasks with the same name so you can modify certain tasks without replacing them.

For example:

```js
xclap.load([namepsace], tasks);
```

You refer to the namespaces with `/`, ie: `ns/foo`.

Anything that was loaded without a namespace is assigned to the default namespace `/`, which can be accessed with a simple leading `/`, ie: `/foo`.

If you run a task without specifying the namespace, then it's searched through all namespaces until it's found. The default namespace is the first one to search. The search is done in the order the namespaces were loaded.

> For obvious reasons, this means task names cannot contain `/`.

#### Auto Complete with namespace

To assist auto completion when using [xclap-cli], you may specify all namespaces with a leading `/` when invoking from the command line. It will be stripped before xclap run them.

ie:

```bash
$ clap /foo/bar
```

That way, you can press `tab` after the first `/` to get auto completion with namespaces.

## Execution Context

A continuous execution context is maintained from the top whenever you invoke a task with `clap <name>`.

The execution context is passed to any task function as `this`. It has the following properties:

- `run` - a function to run another task
- `argv` - arguments to the task
- `err` - For the [`finally`](#finally-hook) hook, if task failed, this would be the error.
- `failed` - The array of all task failure errors.

You can run more tasks under the same context with `this.run`

- run a single task

  - `this.run("task_name")`

- execute tasks serially.

  - `this.run(xclap.serial("name1", "name2", "name3"))`
  - `this.run([ ".", "name1", "name2", "name3"])`

- execute tasks concurrently
  - `this.run(["name1", "name2", "name3"])`

For example:

```js
const tasks = {
  bar: {},
  foo: function() {
    console.log("hello from foo");
    this.run("bar");
  }
};
```

### Task Options

The execution context also has `argv` which is an array of the task options. The first one is the name as used to invoke the task.

Examples:

- `xclap foo` - argv: `["foo"]`
- `xclap foo --bar` - argv: `["foo", "--bar"]`
- `xclap ?foo --bar --woo` - argv: `["?foo", "--bar", "--woo"]`
- `xclap ?ns/foo --bar` - argv: `["?ns/foo", "--bar"]`

The argv is only applicable if the task is a JavaScript `function`.

For example:

```js
const tasks = {
  foo: function() {
    console.log(this.argv);
  },
  boo: {
    desc: "show argv from task options",
    task: function() {
      console.log(this.argv);
    }
  }
};
```

#### Inline Task Options

Task options can be specified inline in the task definition also, not just in command line.

Only the first part separated by space `" "` is used as the task name.

For example,

```js
const tasks = {
  foo: function() {
    console.log(argv);
  },
  zoo: "foo --bar --woo",
  moo: ["?bad", "foo --bar --woo"]
};
```

# APIs

`xclap` supports the following methods:

## `stopOnError`

Configure `xclap`'s behavior if any task execution failed.

Accepted values are:

- `false`, `""` - completely turn off, march on if any tasks failed.
- `"soft"` - Allow existing async tasks to run to completion and invoke `finally` hooks, but no new tasks will be executed.
- `true`, `"full"` - Stop and exit immediately, don't wait for any pending async tasks, `finally` hooks invocation is unreliable.

> XClap defaults this to `"full"`

Example:

```js
const xclap = require("xclap");

xclap.stopOnError = "full";
```

> Note: If user specify this in CLI with option `--soe=<value>` then that will always be used.

## `load([namespace], tasks)`

Load `tasks` into `[namespace]` (optional).

If no `namespace`, then tasks are loaded into the root namespace.

## `run(name, [done])`

Run the task specified by `name`.

- `name` - Either a string or an array of names.
- `done` - Optional callback. If it's not given, then an internal handler is invoked to do `console.log` of the execution result.

## `waitAllPending(done)`

Wait for all pending tasks to complete and then call `done`.

## `env(spec)`

Create a task to set environment variables in `process.env`.

- `spec` - Object of enviroment variables.

Example:

```js
{
  someTask: [xclap.env({ FOO: "bar" }), xclap.exec("echo $FOO")];
}
```

> Note that this can be achieved easily with a function task:

```js
{
  someTask: [() => Object.assign(process.env, { FOO: "bar" }), xclap.exec("echo $FOO")];
}
```

> However, using `xclap.env` will log out the env variables and values nicely.

## `concurrent([tasks]|task1, task2, taskN)`

Explicity creates an array of tasks to be executed concurrently.

- The tasks can be passed in as a single array
- Or they can be passed in as a list of variadic arguments

Returns an array of tasks that's marked for concurrent execution.

## `serial([tasks]|task1, task2, taskN)`

Explicity creates an array of tasks to be executed serially.

- The tasks can be passed in as a single array
- Or they can be passed in as a list of variadic arguments

Returns an array of tasks that's marked for serial execution.

## `exec(spec)`

Create a shell command task spec with _optional_ [`flags`](#shell-task-flags) or `options`.

- `spec` - an object that specifies the following fields:

  - `cmd` - A string, or an array of strings to be combined into a single one with `join(" ")`, to use as the shell command
  - `flags` - [Shell Task Flags](#shell-task-flags), can be specified as:
    - **string** - ie: `"tty,sync"`
    - **array** - ie: `["tty", "sync"]`
  - `execOptions` - options to pass to [child_process.spawn] or [child_process.exec]
  - `xclap` - Object as options for xclap execution
    - `delayRunMs` - milliseconds to wait before actually running the command
  - `env` - Object of environment flags to set. It is actually `Object.assign`ed into `execOptions.env`.

> Alternatively this can also be called as `exec(cmd, [flags|options])`

Where:

- `flags` - string or array as [Shell Task Flags](#shell-task-flags)
- `options` - Object to specify: `{ flags, execOptions, xclap, env }`

Examples:

```js
const xclap = require("xclap");

const tasks = {
  cmd1: xclap.exec("echo hello", "tty"),
  cmd2: [
    // run `echo foo` with env FOO=bar
    xclap.exec("echo foo", { env: { FOO: "bar" } }),
    // run `echo hello world` with tty enabled
    xclap.exec(["echo", "hello", "world"], "tty"),
    // with a single spec object
    xclap.exec({
      cmd: ["echo", "hello", "world"],
      flags: "tty",
      env: { FOO: "bar" }
    })
  ]
};

xclap.load(tasks);
```

[npm scripts]: https://docs.npmjs.com/misc/scripts
[xclap-cli]: https://github.com/jchip/xclap-cli
[bash]: https://www.gnu.org/software/bash/
[zsh]: http://www.zsh.org/
[child_process.spawn]: https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
[child_process.spawnsync]: https://nodejs.org/api/child_process.html#child_process_child_process_spawnsync_command_args_options
[child_process.exec]: https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
[node.js stream]: https://nodejs.org/api/stream.html

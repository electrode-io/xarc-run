# Detail Reference

## Tasks

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

A task can be:

* [A string](#string) - as a shell command to be spawned, or as a [string that contains an array](#string-array)
* [An array](#array) - list of tasks to be processed.
* [A function](#function) - to be called
* [An object](#object) - with a `task` field that's one of the above and allows other supplemental fields.

### String

* A string primarily is executed as a shell command.
* A string [started with `"~["`](#string-array) is parsed into an [array task](#array).

```js
{
  foo: "echo hello";
}
```

`clap foo` will cause the shell command `echo hello` to be spawned.

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

* Functions are treat as a [task function](#function) to be called.
* Strings in an task array are primarily treated as name of another task to look up and execute.
* String started with `"~$"` are treated as [anonymous shell commands](#task-name-as-anonymous-shell-command) to be executed.

The [array serial/concurrent rules](#array-serialconcurrent-rules) will be applied.

```js
{
  foo: ["foo1", "foo2", "foo3"];
}
```

`clap foo` will cause the three tasks `foo1`, `foo2`, `foo3` to be executed **_serially_**.

#### Task Name As Anonymous Shell Command

If the task name in a task array starts with `"~$"` then the rest of it is executed as an anonymous shell command directly.

For example:

```js
{
  foo: ["foo1", "~$echo hello"];
}
```

Will cause the task `foo1` to be executed and then the shell command `echo hello` to be executed.

### Function

```js
{
  foo: function (callback) { return Promise.resolve("hello"); }
}
```

`clap foo` will cause the function to be called.

The `this` context for the function will the clap [Execution Context](#execution-context). If you don't want to use `this`, then you can use fat arrow function for your task.

The function can return:

* `Promise` - `clap` will await for the promise.
* `array` - `clap` will treat the array as a list of tasks to be executed
  * The [array serial/concurrent rules](#array-serialconcurrent-rules) applied to the array.
  * The [anonymous shell command](#task-name-as-anonymous-shell-command) rule applied to each string element.
* `string` - `clap` will treat the string as a task name or an [anonymous shell command to executed](#task-name-as-anonymous-shell-command).
* `function` - `clap` will call the function as another task function.
* `stream` - [TBD]
* `undefined` or anything else - `clap` will wait for the `callback` to be called.

### Object

You can define your task as an object in order to specify more information.

For example:

```js
{
  task1: {
    desc: "description",
    task: <task-definition>,
    dep: <task-definition>
  }
}
```

Where:

* `desc` - Description for the task.
* `task` - [Task definition](#task-definition).
* `dep` - Dependency tasks to be executed first.

## Array serial/concurrent rules

When you definte a task as an array, it should contain a list of task names to be executed serially or concurrently.

Generally, the array of tasks is executed concurrently, and only serially when [certain conditions](#serially) are true.

### Serially

Each task in the array is executed serially if:

* The array is defined at the [top level](#top-level).
* The first element of the array is [`"."`](#first-element-dot).

#### top level

At top level, an array of task names will be executed serially.

```js
{
  foo: ["foo1", "foo2", "foo3"];
}
```

#### First element dot

If the first element of the array is `"."` then the rest of tasks in the array will be executed serially.

```js
{
  foo: ["bar", [".", "foo1", "foo2", "foo3"]];
}
```

#### Concurrently

An array of tasks is executed concurrently, and only serially when [certain conditions](#serially) are true.

For example, at the top level, to execute some tasks concurrently, specify them in a subarray.

`foo1`, `foo2`, and `foo3` are executed **_concurrently_**.

```js
{
  foo: [["foo1", "foo2", "foo3"]];
}
```

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

The execution context is passed to any task function as `this`.

You can run more tasks under the same context with `this.run`

* `this.run("task_name")` will run a single task

* `this.run([ ".", "name1", "name2", "name3"])` will execute them serially.

* `this.run(["name1", "name2", "name3"])` will execute them concurrently.

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

* `xclap foo` - argv: `["foo"]`
* `xclap foo --bar` - argv: `["foo", "--bar"]`
* `xclap ?foo --bar --woo` - argv: `["?foo", "--bar", "--woo"]`
* `xclap ?ns/foo --bar` - argv: `["?ns/foo", "--bar"]`

The argv is only applicable if the task is a JavaScript `function`.

For example:

```js
const tasks = {
  foo: function() {
    console.log(this.argv);
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

[npm scripts]: https://docs.npmjs.com/misc/scripts
[xclap-cli]: https://github.com/jchip/xclap-cli
[bash]: https://www.gnu.org/software/bash/
[zsh]: http://www.zsh.org/

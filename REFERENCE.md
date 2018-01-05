# Advanced Details

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

## Task

A task can be:

* A string - as a shell command to be spawned
* An array - list of names of tasks to be executed
* A function - to be called
* An object - with a `task` field that's one of the above and allows other supplemental fields.

### String

A task that is just a string is treated as a shell command to be executed.

```js
{
  foo: "echo hello";
}
```

`clap foo` will cause the shell command `echo hello` to be spawned.

### Array

```js
{
  foo: ["foo1", "foo2", "foo3"];
}
```

`clap foo` will cause the three tasks `foo1`, `foo2`, `foo3` to be executed **_serially_**.

### Function

```js
{
  foo: function (callback) { return Promise.resolve("hello"); }
}
```

`clap foo` will cause the function to be called.

The `this` context for the function will the clap [Execution Context](#execution-context). If you don't want to use `this`, then you can use fat arrow function for your task.

Then function can return:

* `Promise` - `clap` will await for the promise.
* `array` - `clap` will treat the array as a list of tasks to be executed, with the [array serial/concurrent rules](#array-serialconcurrent-rules) applied.
* `string` - `clap` will treat the string as a shell command to be spawned.
* `function` - `clap` will call the function as another task function.
* `stream` - [TBD]
* `undefined` or anything else - `clap` will wait for the `callback` to be called.

### Object

### Array serial/concurrent rules

When you definte a task as an array, it should contain a list of task names to be executed serially or concurrently.

#### Serially

Each task in the array is executed serially if:

* The array is defined at the [top level](#toplevel).
* The first element of the array is `"."`.

> NOTE: The only time the tasks in an array is automatically executed serially is when the array is defined at the top level.
> All other times it's always executed concurrently unless the [first element is `"."`](#firstelementdot).

ie:

##### top level

At top level, an array of task names will be executed serially.

```js
{
  foo: ["foo1", "foo2", "foo3"];
}
```

##### First element dot

If the first element of the array is `"."` then the rest of the elements in the array are assumed to be task names to be executed serially.

```js
{
  foo: ["bar", [".", "foo1", "foo2", "foo3"]];
}
```

#### Concurrently

Each task in the array is executed concurrently if:

* The array is NOT defined at the [top level](#toplevel).
* Its first element is NOT `"."`.

ie:

`foo1`, `foo2`, and `foo3` are executed **_concurrently_** because they are in a subarray and the first element is NOT `"."`.

```js
{
  foo: [["foo1", "foo2", "foo3"]];
}
```

## Loading Task

Tasks can be loaded with `xclap.load`. You can specify a namespace for the tasks.

### Namespace

A group of tasks can be assigned a namespace.

```js
xclap.load([namepsace], tasks);
```

You refer to the namespaces with `/`, ie: `ns/foo`.

Anything that was loaded without a namespace is assigned to the default namespace `/`, which can be accessed with a simple leading `/`, ie: `/foo`.

If you run a task without specifying the namespace, then it's searched through all namespaces until it's found. The default namespace is the first one to search. The search is done in the order the namespaces were loaded.

> For obvious reasons, this means task names cannot contain `/`.

## Execution Context

A continuous execution context is maintain from the top whenever you invoke a task with `clap <name>`.

The execution context is passed to any task function as `this`.

You can run more tasks under the same context with `this.run`

* `this.run("task_name")` will run a single task

* `this.run([ ".", "name1", "name2", "name3"])` will execute them serially.

* `this.run(["name1", "name2", "name3"])` will execute them concurrently.

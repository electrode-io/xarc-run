var util = require('util');

// Intercept stdout and stderr to pass output thru callback.
//
//  Optionally, takes two callbacks.
//    If two callbacks are specified, 
//      the first intercepts stdout, and
//      the second intercepts stderr.
//
// returns an unhook() function, call when done intercepting
function interceptStdout(stdoutIntercept, stderrIntercept) {
  var old_stdout_write = process.stdout.write;
  var old_stderr_write = process.stderr.write;

  process.stdout.write = (function (write) {
    return function (string, encoding, fd) {
      var result = interceptor(string, stdoutIntercept);
      if (result === false) {
        return;
      }
      var args = Array.prototype.slice.apply(arguments, 0);
      args[0] = result;
      write.apply(process.stdout, args);
    };
  }(process.stdout.write));

  if (stderrIntercept) {
    process.stderr.write = (function (write) {
      return function (string, encoding, fd) {
        var result = interceptor(string, stderrIntercept);
        if (result === false) {
          return;
        }
        var args = Array.prototype.slice.apply(arguments, 0);
        args[0] = result;
        write.apply(process.stderr, args);
      };
    }(process.stderr.write));
  }

  function interceptor(string, callback) {
    // only intercept the string
    var result = callback(string);
    if (result === false) {
      return false;
    }
    if (typeof result == 'string') {
      string = result.replace(/\n$/, '') + (result && (/\n$/).test(string) ? '\n' : '');
    }
    return string;
  }

  // puts back to original
  return function unhook() {
    process.stdout.write = old_stdout_write;
    process.stderr.write = old_stderr_write;
  };

};

interceptStdout.intercept = (silent) => {
  const ctx = {};
  ctx.stdout = [];
  ctx.restore = interceptStdout((msg) => {
    ctx.stdout.push(msg);
    return silent ? false : undefined;
  });
  return ctx;
};

module.exports = interceptStdout;

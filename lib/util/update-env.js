"use strict";

module.exports = function(env, target, override = true) {
  target = target || process.env;
  if (env) {
    Object.keys(env).forEach(k => {
      if (override === false && target.hasOwnProperty(k)) {
        return;
      }
      if (env[k] === undefined || env[k] === null) {
        delete target[k];
      } else {
        target[k] = env[k];
      }
    });
  }
  return target;
};

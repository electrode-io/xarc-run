"use strict";

module.exports = function(env, target) {
  target = target || process.env;
  if (env) {
    Object.keys(env).forEach(k => {
      if (env[k] === undefined || env[k] === null) {
        delete target[k];
      } else {
        target[k] = env[k];
      }
    });
  }
  return target;
};

"use strict";

module.exports = data => {
  try {
    return JSON.stringify(data, (key, value) => {
      if (typeof value === "function") {
        return "func";
      } else if (value.constructor.name === "XTaskSpec") {
        return value.toString();
      } else if (typeof value === "symbol") {
        return `<${value.toString().match(/\(([^)]+)\)/)[1]}>`;
      }
      return value;
    });
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
};

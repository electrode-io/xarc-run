"use strict";

module.exports = data => {
  try {
    return JSON.stringify(data, (key, value) => {
      if (typeof value === "function") {
        return "func";
      }
      return value;
    });
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
};

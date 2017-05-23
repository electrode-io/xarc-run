"use strict";

module.exports = tag => {
  return (
    (tag ? `${tag}_` : "") +
    Math.random().toString(36).substr(2, 10) +
    "_" +
    Date.now().toString(36)
  );
};

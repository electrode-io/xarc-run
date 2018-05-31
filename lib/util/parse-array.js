"use strict";

const stringArray = require("string-array");

module.exports = function pa(str) {
  return stringArray.parse(str, true, true).array; // noPrefix and noExtra
};

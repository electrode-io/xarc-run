module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    mocha: true
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 13
  },
  rules: {
    "no-prototype-builtins": 0,
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
  }
};

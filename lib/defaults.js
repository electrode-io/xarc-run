"use strict";

module.exports = {
  NAMESPACE: "/",
  NS_SEP: "/",
  SERIAL_SIG: ".",
  ANON_SHELL_SIG: "~$",
  ANON_SHELL_OPT_SIG: `~(`,
  ANON_SHELL_OPT_CLOSE_SIG: `)$`,
  SHELL_FLAGS: ["tty", "spawn", "sync", "noenv", "npm"],
  STR_ARRAY_SIG: "~[",
  CONCURRENT_SYM: Symbol("concurrent"),
  SERIAL_SYM: Symbol("serial")
};

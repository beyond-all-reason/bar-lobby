"use strict";
const path = require("node:path");
const os = require("node:os");
const process = require("node:process");
const _interopDefaultLegacy = (e) => e && typeof e === "object" && "default" in e ? e : { default: e };
const path__default = /* @__PURE__ */ _interopDefaultLegacy(path);
const os__default = /* @__PURE__ */ _interopDefaultLegacy(os);
const process__default = /* @__PURE__ */ _interopDefaultLegacy(process);
const homedir = os__default.default.homedir();
const tmpdir = os__default.default.tmpdir();
const { env } = process__default.default;
const macos = (name) => {
  const library = path__default.default.join(homedir, "Library");
  return {
    data: path__default.default.join(library, "Application Support", name),
    config: path__default.default.join(library, "Preferences", name),
    cache: path__default.default.join(library, "Caches", name),
    log: path__default.default.join(library, "Logs", name),
    temp: path__default.default.join(tmpdir, name)
  };
};
const windows = (name) => {
  const appData = env.APPDATA || path__default.default.join(homedir, "AppData", "Roaming");
  const localAppData = env.LOCALAPPDATA || path__default.default.join(homedir, "AppData", "Local");
  return {
    data: path__default.default.join(localAppData, name, "Data"),
    config: path__default.default.join(appData, name, "Config"),
    cache: path__default.default.join(localAppData, name, "Cache"),
    log: path__default.default.join(localAppData, name, "Log"),
    temp: path__default.default.join(tmpdir, name)
  };
};
const linux = (name) => {
  const username = path__default.default.basename(homedir);
  return {
    data: path__default.default.join(env.XDG_DATA_HOME || path__default.default.join(homedir, ".local", "share"), name),
    config: path__default.default.join(env.XDG_CONFIG_HOME || path__default.default.join(homedir, ".config"), name),
    cache: path__default.default.join(env.XDG_CACHE_HOME || path__default.default.join(homedir, ".cache"), name),
    log: path__default.default.join(env.XDG_STATE_HOME || path__default.default.join(homedir, ".local", "state"), name),
    temp: path__default.default.join(tmpdir, username, name)
  };
};
function envPaths(name, { suffix = "nodejs" } = {}) {
  if (typeof name !== "string") {
    throw new TypeError(`Expected a string, got ${typeof name}`);
  }
  if (suffix) {
    name += `-${suffix}`;
  }
  if (process__default.default.platform === "darwin") {
    return macos(name);
  }
  if (process__default.default.platform === "win32") {
    return windows(name);
  }
  return linux(name);
}
exports.envPaths = envPaths;

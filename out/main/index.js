"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const electron = require("electron");
const unhandled = require("electron-unhandled");
const envPaths = require("./env-paths.d2b5ceab.js");
const path = require("path");
const electronUpdater = require("electron-updater");
const vue = require("vue");
const Ajv = require("ajv");
const fs = require("fs");
const typebox = require("@sinclair/typebox");
require("node:path");
require("node:os");
require("node:process");
const _interopDefaultLegacy = (e) => e && typeof e === "object" && "default" in e ? e : { default: e };
function _interopNamespace(e) {
  if (e && e.__esModule)
    return e;
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const unhandled__default = /* @__PURE__ */ _interopDefaultLegacy(unhandled);
const path__default = /* @__PURE__ */ _interopDefaultLegacy(path);
const path__namespace = /* @__PURE__ */ _interopNamespace(path);
const Ajv__default = /* @__PURE__ */ _interopDefaultLegacy(Ajv);
const fs__namespace = /* @__PURE__ */ _interopNamespace(fs);
class MainWindow {
  window;
  settings;
  constructor(settings) {
    this.settings = settings;
    this.window = new electron.BrowserWindow({
      title: "Beyond All Reason",
      fullscreen: this.settings.model.fullscreen.value,
      frame: true,
      show: false,
      minWidth: 1440,
      minHeight: 900,
      darkTheme: true,
      paintWhenInitiallyHidden: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        nodeIntegrationInSubFrames: true,
        nodeIntegrationInWorker: true,
        webSecurity: false,
        backgroundThrottling: false
      }
    });
    this.window.once("ready-to-show", () => this.show());
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      electron.shell.openExternal(url);
      return { action: "deny" };
    });
    this.window.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      callback({ requestHeaders: { Origin: "*", ...details.requestHeaders } });
    });
    this.window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const obj = { responseHeaders: { ...details.responseHeaders } };
      if (!obj.responseHeaders["Access-Control-Allow-Origin"] && !obj.responseHeaders["access-control-allow-origin"]) {
        obj.responseHeaders["Access-Control-Allow-Origin"] = ["*"];
      }
      callback(obj);
    });
    vue.watch(this.settings.model.displayIndex, (displayIndex) => this.setDisplay(displayIndex));
    vue.watch(this.settings.model.fullscreen, (fullscreen) => {
      this.window.setFullScreen(fullscreen);
      this.window.maximize();
    });
    this.init();
  }
  async init() {
    if (electron.app.isPackaged) {
      await electronUpdater.autoUpdater.checkForUpdatesAndNotify({
        title: "Beyond All Reason",
        body: `Updated to version ${electron.app.getVersion()}`
      });
      this.window.loadFile(path__default.default.join(__dirname, "../renderer/index.html"));
    } else {
      if (process.env.ELECTRON_RENDERER_URL) {
        this.window.loadURL(process.env.ELECTRON_RENDERER_URL);
      } else {
        console.error("ELECTRON_RENDERER_URL is undefined");
      }
      this.window.webContents.openDevTools();
    }
  }
  show() {
    this.setDisplay(this.settings.model.displayIndex.value);
    this.window.setMenuBarVisibility(false);
    this.window.show();
    this.window.focus();
  }
  setDisplay(displayIndex) {
    const display = electron.screen.getAllDisplays()[displayIndex];
    if (display) {
      const { x, y, width, height } = display.bounds;
      this.window.setPosition(x, y);
      this.window.setSize(width, height);
      this.window.maximize();
      this.settings.model.displayIndex.value = displayIndex;
    }
  }
}
class StoreAPI {
  constructor(file, schema, syncWithMain = false) {
    this.syncWithMain = syncWithMain;
    this.filePath = file;
    this.name = path__namespace.parse(file).name;
    this.schema = schema;
    this.ajv = new Ajv__default.default({ coerceTypes: true, useDefaults: true });
    this.validator = this.ajv.compile(this.schema);
  }
  model;
  filePath;
  name;
  schema;
  ajv;
  validator;
  fileHandle;
  writeTimeout = null;
  async init() {
    const dir = path__namespace.parse(this.filePath).dir;
    await fs__namespace.promises.mkdir(dir, { recursive: true });
    await this.read();
    if (process.type === "renderer") {
      const ipcRenderer = (await Promise.resolve().then(() => /* @__PURE__ */ _interopNamespace(require("electron")))).ipcRenderer;
      for (const value of Object.values(this.model)) {
        vue.watch(value, async () => {
          await this.write();
          if (this.syncWithMain) {
            ipcRenderer.invoke(`store-update:${this.name}`, this.serialize());
          }
        });
      }
    } else if (process.type === "browser") {
      const ipcMain = (await Promise.resolve().then(() => /* @__PURE__ */ _interopNamespace(require("electron")))).ipcMain;
      ipcMain.handle(`store-update:${this.name}`, async (event, model) => {
        for (const [key, val] of Object.entries(model)) {
          this.model[key].value = val;
        }
      });
    }
    return this;
  }
  openFileInEditor() {
    electron.shell.openExternal(this.filePath);
  }
  validate(store) {
    const isValid = this.validator(store);
    return isValid;
  }
  async read() {
    try {
      this.fileHandle = await fs__namespace.promises.open(this.filePath, "r+");
    } catch {
      this.fileHandle = await fs__namespace.promises.open(this.filePath, "w+");
    }
    const fileBuffer = await this.fileHandle.readFile();
    const fileString = fileBuffer.toString();
    const model = fileString ? JSON.parse(fileString) : {};
    this.validate(model);
    this.model = vue.toRefs(vue.reactive(model));
    if (!fileString) {
      await this.write();
    }
  }
  async write() {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    const timeoutFunc = process.type === "renderer" ? window.setTimeout : setTimeout;
    this.writeTimeout = timeoutFunc(async () => {
      const obj = {};
      for (const key in this.model) {
        const value = this.model[key];
        obj[key] = value.value;
      }
      await this.fileHandle.truncate(0);
      await this.fileHandle.write(JSON.stringify(obj, null, 4), 0);
    }, 100);
  }
  serialize() {
    const obj = {};
    for (const [key, val] of Object.entries(this.model)) {
      obj[key] = val.value;
    }
    return obj;
  }
}
const settingsSchema = typebox.Type.Strict(
  typebox.Type.Object({
    fullscreen: typebox.Type.Boolean({ default: true }),
    displayIndex: typebox.Type.Number({ default: 0 }),
    skipIntro: typebox.Type.Boolean({ default: false }),
    sfxVolume: typebox.Type.Number({ default: 5, minimum: 0, maximum: 100 }),
    musicVolume: typebox.Type.Number({ default: 5, minimum: 0, maximum: 100 }),
    loginAutomatically: typebox.Type.Boolean({ default: true })
  })
);
class Application {
  app;
  mainWindow;
  settings;
  initialised = false;
  constructor(app2) {
    this.app = app2;
    this.app.setName("Beyond All Reason");
    process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
    electron.protocol.registerSchemesAsPrivileged([
      {
        scheme: "bar",
        privileges: {
          secure: true,
          standard: true,
          stream: true
        }
      }
    ]);
    this.app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");
    this.app.commandLine.appendSwitch("in-process-gpu");
    this.app.commandLine.appendSwitch("disable-direct-composition");
    if (process.env.NODE_ENV !== "production") {
      if (process.platform === "win32") {
        process.on("message", (data) => {
          if (data === "graceful-exit") {
            app2.quit();
          }
        });
      } else {
        process.on("SIGTERM", () => {
          app2.quit();
        });
      }
    }
    this.app.on("ready", () => this.onReady());
    this.app.on("window-all-closed", () => this.app.quit());
  }
  async onReady() {
    if (!electron.app.isPackaged)
      ;
    if (!this.initialised) {
      this.initialised = true;
      this.init();
    }
  }
  async init() {
    const info = this.getInfo();
    const settingsFilePath = path__namespace.join(info.configPath, "settings.json");
    this.settings = await new StoreAPI(settingsFilePath, settingsSchema).init();
    this.mainWindow = new MainWindow(this.settings);
    this.setupHandlers();
  }
  setupHandlers() {
    electron.ipcMain.handle("getInfo", async () => {
      return this.getInfo();
    });
    electron.ipcMain.handle("highlightTaskbarIcon", (_, shouldHighlight) => {
      this.mainWindow?.window.flashFrame(shouldHighlight);
    });
  }
  getInfo() {
    const resourcesPath = process.env.NODE_ENV === "production" ? process.resourcesPath : path__namespace.join(this.app.getAppPath(), "resources");
    const paths = envPaths.envPaths(electron.app.getName(), { suffix: "" });
    const displayIds = electron.screen.getAllDisplays().map((display) => display.id);
    let currentDisplayId = 0;
    if (this.mainWindow) {
      currentDisplayId = electron.screen.getDisplayNearestPoint(this.mainWindow.window.getBounds()).id;
    }
    const info = {
      resourcesPath,
      contentPath: paths.data,
      configPath: paths.config,
      lobby: {
        name: "BAR Lobby",
        version: this.app.getVersion(),
        hash: "123"
      },
      hardware: {
        numOfDisplays: displayIds.length,
        currentDisplayIndex: displayIds.indexOf(currentDisplayId)
      }
    };
    return info;
  }
  async setupSteam() {
    try {
      const steamworks = await Promise.resolve().then(() => /* @__PURE__ */ _interopNamespace(require("steamworks.js")));
      const client = steamworks.init(480);
      console.log(client.localplayer.getName());
    } catch (err) {
      console.error(err);
    }
  }
}
unhandled__default.default();
new Application(electron.app);
exports.Application = Application;

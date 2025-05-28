import { contentSources } from "@main/config/content-sources";
import envPaths from "env-paths";
import path from "path";
import { env } from "process";
import { app } from "electron";

export const APP_NAME = "Beyond All Reason";

const paths = envPaths(APP_NAME, { suffix: env.APP_NAME_SUFFIX || "" });
const INSTALL_PATH = path.parse(app.getPath("exe")).dir;

// Define the file types
export const DATA_PATH = app.isPackaged && process.platform === "win32" ? path.join(INSTALL_PATH, "data") : paths.data;
export const STATE_PATH = paths.data;
export const CONFIG_PATH = paths.config;

// State files
export const REPLAYS_PATH = path.join(STATE_PATH, "demos");
export const LOGS_PATH = path.join(STATE_PATH, "logs");

// Data files
export const MAPS_PATH = path.join(DATA_PATH, "maps");
export const ENGINE_PATH = path.join(DATA_PATH, "engine");
export const PACKAGE_PATH = path.join(DATA_PATH, "packages");
export const GAME_PATH = path.join(DATA_PATH, "games");
export const POOL_PATH = path.join(DATA_PATH, "pool");
export const SCENARIO_IMAGE_PATH = path.join(DATA_PATH, "scenario-images");
export const GAME_VERSIONS_GZ_PATH = path.join(DATA_PATH, "rapid", contentSources.rapid.host, contentSources.rapid.game, "versions.gz");

import { contentSources } from "@main/config/content-sources";
import envPaths from "env-paths";
import path from "path";
import { env } from "process";

export const APP_NAME = "Beyond All Reason";

const paths = envPaths(APP_NAME, { suffix: env.APP_NAME_SUFFIX || "" });
export const CONTENT_PATH = paths.data;
export const CONFIG_PATH = paths.config;

export const REPLAYS_PATH = path.join(CONTENT_PATH, "demos");
export const MAPS_PATH = path.join(CONTENT_PATH, "maps");

export const GAME_VERSIONS_GZ_PATH = path.join(CONTENT_PATH, "rapid", contentSources.rapid.host, contentSources.rapid.game, "versions.gz");

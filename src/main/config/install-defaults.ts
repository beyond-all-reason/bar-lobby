// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";
import path from "path";
import { getAssetsPath } from "@main/config/app";
import { EDITION_FEATURES } from "@main/config/edition";
import { INSTALL_DEFAULT_FILES, InstallDefaults, parseDefaultFile } from "@shared/install-defaults";
import { configService } from "@main/services/config.service";
import { logger } from "@main/utils/logger";

const log = logger("install-defaults.ts");

let read: { assetsPath: string; defaults: InstallDefaults } | undefined;

function readDefault(assetsPath: string, type: keyof typeof INSTALL_DEFAULT_FILES) {
    const file = path.join(assetsPath, ...INSTALL_DEFAULT_FILES[type]);
    let text: string | undefined;
    try {
        text = fs.readFileSync(file, "utf8");
    } catch {
        text = undefined;
    }
    const version = parseDefaultFile(text);
    if (version) {
        log.info(`Default ${type} from the install: ${version}`);
    } else if (!EDITION_FEATURES.downloadEngineAndGame) {
        log.warn(`${file} is ${text === undefined ? "missing" : "empty"}, so the install names no default ${type}`);
    }

    return version;
}

// Read once per assets directory, which only moves on an edition that does not bundle anything.
export function getInstallDefaults(): InstallDefaults {
    const assetsPath = getAssetsPath();
    if (read?.assetsPath !== assetsPath) {
        read = { assetsPath, defaults: { engine: readDefault(assetsPath, "engine"), game: readDefault(assetsPath, "game") } };
    }

    return read.defaults;
}

// The install's own default engine wins over the remote config's, which may name one the install doesn't have.
export function getDefaultEngineVersion(): string {
    return getInstallDefaults().engine ?? configService.getConfig().defaultEngineVersion;
}

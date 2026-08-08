// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { WRITE_DATA_PATH } from "@main/config/app";
import { logger } from "@main/utils/logger";
import { configService } from "@main/services/config.service";

const log = logger("main/game/springsettings.ts");

const SPRINGSETTINGS_PATH = path.join(WRITE_DATA_PATH, "springsettings.cfg");

const BAR_SPRINGSETTINGS_DEFAULTS = configService.getConfig().springSettings;

function readSettings(filePath: string): Map<string, string> {
    const settings = new Map<string, string>();
    let fileContent = "";
    try {
        fileContent = fs.readFileSync(filePath, "utf-8");
    } catch {
        return settings;
    }
    for (const line of fileContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        settings.set(trimmed.slice(0, eqIndex).trim(), trimmed.slice(eqIndex + 1).trim());
    }
    return settings;
}

function writeSettings(settings: Map<string, string>, filePath: string): void {
    const lines: string[] = [];
    for (const [key, value] of settings) {
        lines.push(`${key} = ${value}`);
    }
    fs.writeFileSync(filePath, lines.join(os.EOL) + os.EOL, "utf-8");
}

export function applyDefaultSpringsettings(): void {
    try {
        fs.mkdirSync(path.dirname(SPRINGSETTINGS_PATH), { recursive: true });
        const settings = readSettings(SPRINGSETTINGS_PATH);
        let changed = false;
        for (const [key, value] of Object.entries(BAR_SPRINGSETTINGS_DEFAULTS)) {
            if (!settings.has(key)) {
                settings.set(key, String(value));
                changed = true;
            }
        }
        if (changed) {
            writeSettings(settings, SPRINGSETTINGS_PATH);
            log.info("Applied default springsettings");
        }
    } catch (err) {
        log.error(`Failed to apply default springsettings: ${err}`);
    }
}

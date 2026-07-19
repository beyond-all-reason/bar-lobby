// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
// Run this script to generate a default config file.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "url";
import { Value } from "@sinclair/typebox/value";
import { configSchema } from "../src/main/json/model/config";

export function generateDefaultConfig(targetPath?: string) {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const OUTPUT_PATH = targetPath ? targetPath : path.resolve(dirname, "../config.json");
    const targetDir = path.dirname(OUTPUT_PATH);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    const DEFAULT_CONFIG = Value.Create(configSchema);
    const json = JSON.stringify(DEFAULT_CONFIG, null, 2);
    fs.writeFileSync(OUTPUT_PATH, json, "utf-8");
    console.log(`Default config written to ${OUTPUT_PATH}`);
    return OUTPUT_PATH;
}

generateDefaultConfig(process.env.BAR_CONFIG_OUTPUT_PATH);

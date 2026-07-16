// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// For GitHub Actions workflow.
// This script will compare the prior version of the defaults to a new version.
// Once done, only the changed defaults, plus one required default, will be written to a file
// That config can then be uploaded by GH Action to be the new defaults for existing clients to fetch.

import * as fs from "node:fs";
import { Value } from "@sinclair/typebox/value";
import { configSchema, TUpdateConfigSchema } from "@main/json/model/config";

export function generateDiffConfig(oldPath?: string, newPath?: string) {
    if (!oldPath) {
        throw new Error("Env Var OLD_CONFIG path must be provided.");
    }
    if (!newPath) {
        throw new Error("Env Var NEW_CONFIG path must be provided.");
    }

    const oldJson = JSON.parse(fs.readFileSync(oldPath, "utf-8"));
    if (!Value.Check(configSchema, oldJson)) {
        throw new Error("Provided OLD_CONFIG does not match schema");
    }

    const newJson = JSON.parse(fs.readFileSync(newPath, "utf-8"));
    if (!Value.Check(configSchema, newJson)) {
        throw new Error("Provided NEW_CONFIG does not match schema");
    }

    const delta = Value.Diff(oldJson, newJson);

    const diff: TUpdateConfigSchema = {};
    for (const o of delta) {
        switch (o.type) {
            // Entirely new default item, we have to insert this into the new config
            case "insert":
                diff[o.path] = o.value;
                break;
            // Changed default item
            case "update":
                diff[o.path] = o.value;
                break;
            // Removed a default item, we ignore these and clients will use their existing defaults if they need it.
            case "delete":
                break;
        }
    }
    diff.configUrl = configSchema.properties.configUrl.default; //Required property, but not likely to be in the diff.
    writeDiffConfig(diff);
}

function writeDiffConfig(config: TUpdateConfigSchema) {
    const json = JSON.stringify(config, null, 2);
    const OUTPUT_PATH = process.env.BAR_OUTPUT_CONFIG_PATH ?? "config.json";
    fs.writeFileSync(OUTPUT_PATH, json, "utf-8");
    console.log(`Diff config written to ${OUTPUT_PATH}`);
}

generateDiffConfig(process.env.BAR_OLD_CONFIG_PATH, process.env.BAR_NEW_CONFIG_PATH);

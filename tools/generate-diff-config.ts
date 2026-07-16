// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// For GitHub Actions workflow.
// This script will compare an old and new version of a config.json file.
// The result will be an config that contains the following:
// 1. Updated elements from the new config.
// 2. Items from the old config that are missing in the new config.
// 3. New items from the new config, but only if they are not default values in the schema.
// That config can then be uploaded by GH Action to be the new defaults for existing clients to fetch.

import * as fs from "node:fs";
import { Value, ValuePointer } from "@sinclair/typebox/value";
import { configSchema, updateConfigSchema, TUpdateConfigSchema } from "../src/main/json/model/config";

export function generateDiffConfig(oldPath?: string, newPath?: string) {
    if (!oldPath) {
        throw new Error("Env Var BAR_OLD_CONFIG_PATH path must be provided.");
    }
    if (!newPath) {
        throw new Error("Env Var BAR_NEW_CONFIG_PATH path must be provided.");
    }

    const oldJson = JSON.parse(fs.readFileSync(oldPath, "utf-8"));
    if (!Value.Check(updateConfigSchema, oldJson)) {
        throw new Error("Provided BAR_OLD_CONFIG_PATH does not match schema");
    }

    const newJson = JSON.parse(fs.readFileSync(newPath, "utf-8"));
    if (!Value.Check(updateConfigSchema, newJson)) {
        throw new Error("Provided BAR_NEW_CONFIG_PATH does not match schema");
    }

    const defaults = Value.Create(configSchema);
    const delta = Value.Diff(oldJson, newJson);
    const config: TUpdateConfigSchema = {};
    for (const patch of delta) {
        switch (patch.type) {
            // Keep values of removed elements for clients that are not updated.
            case "delete":
                ValuePointer.Set(config, patch.path, ValuePointer.Get(oldJson, patch.path));
                break;
            // Insert new elements only if absent from default schema OR if it is not a default schema value
            case "insert":
                if (!ValuePointer.Has(defaults, patch.path) || !Value.Equal(ValuePointer.Get(defaults, patch.path), patch.value)) {
                    ValuePointer.Set(config, patch.path, patch.value);
                }
                break;
            // Always keep values that have been updated.
            case "update":
                ValuePointer.Set(config, patch.path, patch.value);
                break;
        }
    }
    // Required element for a valid config
    if (!config.configUrl) {
        config.configUrl = defaults.configUrl;
    }
    writeConfig(config);
}

function writeConfig(config: TUpdateConfigSchema) {
    const json = JSON.stringify(config, null, 2);
    const OUTPUT_PATH = process.env.BAR_OUTPUT_CONFIG_PATH ?? "config.json";
    fs.writeFileSync(OUTPUT_PATH, json, "utf-8");
    console.log(`Diff config written to ${OUTPUT_PATH}`);
}

generateDiffConfig(process.env.BAR_OLD_CONFIG_PATH, process.env.BAR_NEW_CONFIG_PATH);

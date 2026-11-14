// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import path from "node:path";
import { Value } from "@sinclair/typebox/value";
import { updateConfigSchema } from "../src/main/json/model/config";

const configPath = path.resolve(process.cwd(), "remoteConfig/config.json");

try {
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));

    if (!Value.Check(updateConfigSchema, config)) {
        console.error(`Config file does not match the schema: ${configPath}`);
        for (const error of Value.Errors(updateConfigSchema, config)) {
            console.error(`${error.path} ${error.message}: ${JSON.stringify(error.value)}`);
        }
        process.exitCode = 1;
    } else {
        console.log(`Config file matches the schema: ${configPath}`);
    }
} catch (error) {
    console.error(`Unable to validate config file: ${configPath}`);
    console.error(error);
    process.exitCode = 1;
}

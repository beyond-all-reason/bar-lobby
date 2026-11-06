// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";
import path from "path";
import { getAssetsPath } from "@main/config/app";
import { EDITION_FEATURES } from "@main/config/edition";
import { BUNDLED_CONTENT_FILE, BundledContent, parseBundledContent } from "@shared/bundled-content";
import { logger } from "@main/utils/logger";

const log = logger("bundled-content.ts");

let read: { assetsPath: string; content: BundledContent } | undefined;

// Read once per assets directory, which only moves on an edition that does not bundle anything.
export function getBundledContent(): BundledContent {
    const assetsPath = getAssetsPath();
    if (read?.assetsPath === assetsPath) {
        return read.content;
    }

    const file = path.join(assetsPath, BUNDLED_CONTENT_FILE);
    let json: string | undefined;
    try {
        json = fs.readFileSync(file, "utf8");
    } catch {
        json = undefined;
    }

    const content = parseBundledContent(json);
    if (content.engines.length > 0 || content.games.length > 0) {
        log.info(`Bundled with the install: engines ${content.engines.join(", ") || "none"}; games ${content.games.join(", ") || "none"}`);
    } else if (!EDITION_FEATURES.downloadEngineAndGame) {
        log.warn(`${file} is ${json === undefined ? "missing" : "empty or unreadable"}, so the installed engine and game cannot be told apart from any other`);
    }

    read = { assetsPath, content };

    return content;
}

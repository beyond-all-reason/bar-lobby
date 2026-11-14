// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import fs from "fs";
import { app } from "electron";
import { Edition, EditionFeatures, editionFeatures, resolveEdition } from "@shared/edition";

// Resolved before the single-instance lock and the paths, so nothing here may open the log file.

function readPackageJson() {
    try {
        return fs.readFileSync(path.join(app.getAppPath(), "package.json"), "utf8");
    } catch {
        return undefined;
    }
}

export const EDITION: Edition = resolveEdition({ isPackaged: app.isPackaged, packageJson: readPackageJson(), envEdition: process.env.BAR_EDITION });
export const EDITION_FEATURES: EditionFeatures = editionFeatures(EDITION);

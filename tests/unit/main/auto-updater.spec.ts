// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { describe, expect, it } from "vitest";

import { getAutoUpdaterInitializationSkipReason } from "@main/config/auto-updater";
import { getMacOSAppUpdateMetadataPath, getMacOSPortableStateMarkerPath } from "@main/config/macos-portable";

const resourcesPath = "/Applications/BAR.app/Contents/Resources";

describe("auto updater initialization", () => {
    it("skips development runs", () => {
        expect(
            getAutoUpdaterInitializationSkipReason({
                isPackaged: false,
                platform: "darwin",
                resourcesPath,
                pathExists: () => true,
            })
        ).toBe("App is not packaged");
    });

    it("keeps non-macOS packaged updater behavior unchanged", () => {
        expect(
            getAutoUpdaterInitializationSkipReason({
                isPackaged: true,
                platform: "win32",
                resourcesPath: path.join("C:", "Program Files", "BeyondAllReason", "resources"),
                pathExists: () => false,
            })
        ).toBeUndefined();
    });

    it("skips macOS portable builds marked with app-adjacent state", () => {
        const markerPath = getMacOSPortableStateMarkerPath(resourcesPath);

        expect(
            getAutoUpdaterInitializationSkipReason({
                isPackaged: true,
                platform: "darwin",
                resourcesPath,
                pathExists: (filePath) => filePath === markerPath,
            })
        ).toBe("macOS portable build detected");
    });

    it("skips macOS packaged builds without updater metadata", () => {
        expect(
            getAutoUpdaterInitializationSkipReason({
                isPackaged: true,
                platform: "darwin",
                resourcesPath,
                pathExists: () => false,
            })
        ).toBe("macOS update metadata is unavailable");
    });

    it("allows macOS packaged release builds with updater metadata", () => {
        const metadataPath = getMacOSAppUpdateMetadataPath(resourcesPath);

        expect(
            getAutoUpdaterInitializationSkipReason({
                isPackaged: true,
                platform: "darwin",
                resourcesPath,
                pathExists: (filePath) => filePath === metadataPath,
            })
        ).toBeUndefined();
    });
});

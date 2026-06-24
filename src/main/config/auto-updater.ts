// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { getMacOSAppUpdateMetadataPath, getMacOSPortableStateMarkerPath } from "@main/config/macos-portable";

export type AutoUpdaterRuntime = {
    isPackaged: boolean;
    platform: NodeJS.Platform;
    resourcesPath?: string;
    pathExists: (filePath: string) => boolean;
};

export function getAutoUpdaterInitializationSkipReason(runtime: AutoUpdaterRuntime): string | undefined {
    if (!runtime.isPackaged) {
        return "App is not packaged";
    }

    if (runtime.platform !== "darwin") {
        return undefined;
    }

    if (!runtime.resourcesPath) {
        return "macOS resources path is unavailable";
    }

    if (runtime.pathExists(getMacOSPortableStateMarkerPath(runtime.resourcesPath))) {
        return "macOS portable build detected";
    }

    if (!runtime.pathExists(getMacOSAppUpdateMetadataPath(runtime.resourcesPath))) {
        return "macOS update metadata is unavailable";
    }

    return undefined;
}

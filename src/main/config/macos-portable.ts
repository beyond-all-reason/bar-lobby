// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";

export const MACOS_PORTABLE_STATE_MARKER_FILE_NAME = "bar-portable-state";
export const MACOS_APP_UPDATE_METADATA_FILE_NAME = "app-update.yml";

export function getMacOSPortableStateMarkerPath(resourcesPath: string): string {
    return path.join(resourcesPath, MACOS_PORTABLE_STATE_MARKER_FILE_NAME);
}

export function getMacOSAppUpdateMetadataPath(resourcesPath: string): string {
    return path.join(resourcesPath, MACOS_APP_UPDATE_METADATA_FILE_NAME);
}

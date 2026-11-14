// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const mapsApi = {
    downloadMaps: (springNames: string[]) => ipcCall("maps:downloadMaps", () => window.maps.downloadMaps(springNames)),
};

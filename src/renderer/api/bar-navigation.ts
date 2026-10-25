// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const barNavigationApi = {
    signalReady: () => ipcCall("renderer:ready", () => window.barNavigation.signalReady()),
};

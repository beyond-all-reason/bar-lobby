// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const infoApi = {
    getInfo: () => ipcCall("info:get", () => window.info.getInfo()),
};

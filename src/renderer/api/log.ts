// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { logLevels } from "@shared/log-levels";
import { ipcCall } from "@renderer/api/ipc-call";

export const logApi = {
    log: (fileName: string, level: logLevels, msg: string) => ipcCall("log:log", () => window.log.log(fileName, level, msg)),
    upload: () => ipcCall("log:upload", () => window.log.upload()),
};

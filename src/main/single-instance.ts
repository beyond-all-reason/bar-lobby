// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app } from "electron";

// Imports are hoisted, so the lock has to be taken by the first module in the
// graph rather than at the top of main.ts, or modules that log while loading
// will have already opened a log file.
if (!app.requestSingleInstanceLock()) {
    app.exit(0);
}

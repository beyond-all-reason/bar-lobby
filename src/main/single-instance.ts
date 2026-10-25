// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app } from "electron";

// The lock lives in userData, so it is only taken once app.ts has pointed userData at the state
// directory. That way BAR_STATE_PATH isolates the lock along with everything else. app.ts writes to the
// console only, never the log file.
import "@main/config/app";

// Imports are hoisted, so the lock has to be taken by the first module in the
// graph rather than at the top of main.ts, or modules that log while loading
// will have already opened a log file.
if (!app.requestSingleInstanceLock() && process.env.NODE_ENV !== "development") {
    app.exit(0);
}

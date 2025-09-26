// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { spawn } from "child_process";
import waitOn from "wait-on";

export default async () => {
    spawn("vite", ["--config", "vite.playwright.config.mts", "--logLevel", "silent"], {
        stdio: "ignore",
        detached: true,
    });

    await waitOn({ resources: ["http://localhost:5173"], timeout: 3000 });
};

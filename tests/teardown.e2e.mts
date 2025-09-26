// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { execSync } from "node:child_process";

export default async () => {
    try {
        const pids = execSync(`pgrep -f "vite.playwright"`).toString().trim().split("\n");
        for (const pid of pids) {
            if (pid) {
                process.kill(Number(pid), "SIGTERM");
            }
        }
    } catch (err) {
        const error = err as Error;

        // if pid is already closed ignore error
        if (error.message != "kill ESRCH") {
            throw error;
        }
    }
};

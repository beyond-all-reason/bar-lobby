// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { logLevels } from "@main/services/log.service";
import { logApi } from "@renderer/api/log";

export class Logger {
    filename: string;
    constructor(filename: string) {
        this.filename = filename;
    }

    debug(msg: string) {
        this.write("debug", msg);
    }

    info(msg: string) {
        this.write("info", msg);
    }

    error(msg: string) {
        this.write("error", msg);
    }

    fatal(msg: string) {
        this.write("fatal", msg);
    }

    private write(level: logLevels, msg: string) {
        logApi.log(this.filename, level, msg);
    }
}

export async function uploadLogs() {
    return await logApi.upload();
}

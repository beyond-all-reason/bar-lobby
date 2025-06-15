// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export class Logger {
    filename: string;
    constructor(filename: string) {
        this.filename = filename;
    }

    debug(msg: string) {
        window.log.log(this.filename, "debug", msg);
    }

    info(msg: string) {
        window.log.log(this.filename, "info", msg);
    }

    error(msg: string) {
        window.log.log(this.filename, "error", msg);
    }

    fatal(msg: string) {
        window.log.log(this.filename, "fatal", msg);
    }
}

export async function uploadLogs() {
    return await window.log.upload();
}

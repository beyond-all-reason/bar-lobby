// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

const PREFIX = "lobby-";
const EXTENSION = "log";
const RUN_ID_PATTERN = "\\d{8}T\\d{6}";

export const LOG_FILE_NAME = new RegExp(`^${PREFIX}${RUN_ID_PATTERN}\\.${EXTENSION}$`);

export function logFileName(date: Date) {
    const runId = date
        .toISOString()
        .replace(/[^0-9T]/g, "")
        .substring(0, 15);

    return `${PREFIX}${runId}.${EXTENSION}`;
}

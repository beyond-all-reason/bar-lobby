// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import pino from "pino";
import PinoPretty from "pino-pretty";
import { LOGS_PATH } from "@main/config/app";
import path from "path";
import { mkdirSync, readdirSync, rmSync, statSync } from "fs";

// Ensure that the logs directory is created.
mkdirSync(LOGS_PATH, { recursive: true });

const MAX_LOBBY_LOG_FILES = 14;
const LOBBY_LOG_FILE_PATTERN = /^lobby-\d{8}T\d{6}\.log$/;

function purgeOldLobbyLogFiles() {
    const lobbyLogFiles = readdirSync(LOGS_PATH, { withFileTypes: true })
        .filter((entry) => entry.isFile() && LOBBY_LOG_FILE_PATTERN.test(entry.name))
        .map((entry) => {
            const filePath = path.join(LOGS_PATH, entry.name);
            const fileStat = statSync(filePath);
            return {
                filePath,
                createTime: fileStat.birthtimeMs || fileStat.mtimeMs,
            };
        })
        .sort((a, b) => b.createTime - a.createTime);

    for (const logFile of lobbyLogFiles.slice(MAX_LOBBY_LOG_FILES)) {
        rmSync(logFile.filePath, { force: true });
    }
}

purgeOldLobbyLogFiles();

const messageFormatting = {
    messageFormat: "{source}{separator}{date}{separator}{filename}{separator}{msg}",
    ignore: "pid,hostname,filename,separator,date,source",
};

const stdStream = PinoPretty({
    ...messageFormatting,
    colorize: true,
    destination: 1,
});

const runId = new Date()
    .toISOString()
    .replace(/[^0-9T]/g, "")
    .substring(0, 15);
const logFilePath = path.join(LOGS_PATH, `lobby-${runId}.log`);

const logStream = PinoPretty({
    ...messageFormatting,
    colorize: false,
    colorizeObjects: false,
    destination: pino.destination({
        dest: logFilePath,
        sync: true,
    }),
});

const parentLogger = pino({}, pino.multistream([stdStream, logStream]));

interface LoggerOptions {
    separator: string;
    level: string;
    source?: "main" | "renderer";
}
export function logger(filename: string, options?: LoggerOptions) {
    const separator = options?.separator || " - ";
    const level = options?.level || "debug";
    const date = new Date().toISOString();
    const source = options?.source || "main";
    return parentLogger.child(
        { filename, separator, date, source },
        {
            level,
        }
    );
}

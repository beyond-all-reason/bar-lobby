// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { LOG_FILE_NAME, logFileName } from "@main/utils/log-file-name";

const runStart = new Date("2026-07-27T13:18:00.000Z");

describe("log file naming", () => {
    it("names a run log after the time it started", () => {
        expect(logFileName(runStart)).toBe("lobby-20260727T131800.log");
    });

    it("matches the names the logger creates", () => {
        expect(logFileName(runStart)).toMatch(LOG_FILE_NAME);
    });

    it("does not match the copy taken when packing logs for upload", () => {
        const copy = `${logFileName(runStart).replace(/\.log$/, "")}most_recent.log`;

        expect(copy).not.toMatch(LOG_FILE_NAME);
    });
});

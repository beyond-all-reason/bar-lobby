// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import crypto from "node:crypto";
import zlib from "node:zlib";

// A file laid out as a Recoil .ssf begins: gzip of the engine version, start script and map name twice, each
// NUL-terminated, then the game state, which nothing here reads. The state is random so it doesn't compress
// away, and a reader has to stop at the header rather than inflate everything.
export function fakeEngineSave(engineVersion: string, script: string, mapName = "Some Map 1.0", stateBytes = 256 * 1024): Buffer {
    const header = Buffer.from(`${engineVersion}\0${script}\0${mapName}\0${mapName}\0`, "utf8");

    return zlib.gzipSync(Buffer.concat([header, crypto.randomBytes(stateBytes)]));
}

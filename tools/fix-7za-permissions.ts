// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// 7zip-bin's Linux 7za arrives from npm without its executable bit, so running from source on Linux (and the
// tests on a Linux CI runner) fail with EACCES. Restores it after install. Packaged builds get the same fix in
// electron-builder.ts's afterPack.

import fs from "node:fs/promises";
import path from "node:path";

if (process.platform === "linux") {
    const binDir = path.resolve("node_modules", "7zip-bin", "linux");
    for (const arch of await fs.readdir(binDir)) {
        await fs.chmod(path.join(binDir, arch, "7za"), 0o755);
    }
}

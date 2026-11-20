// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { IpcResult } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";

const log = logger("over-ipc.ts");

// A call over IPC gives the renderer the reason it failed as a code to word, since a thrown error would reach
// it as its message alone. What is behind the code goes to the log.
export async function overIpc<T>(action: () => Promise<T>, reasonOf: (err: unknown) => string): Promise<IpcResult<T>> {
    try {
        return { status: "success", data: await action() };
    } catch (err) {
        const reason = reasonOf(err);
        const details = err instanceof Error ? err.message : String(err);
        log.error(`${reason}: ${details}`);

        return { status: "failed", reason, details };
    }
}

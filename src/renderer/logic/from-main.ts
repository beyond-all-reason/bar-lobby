// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { IpcResult } from "@shared/ipc-result";

// The data main gave, or the reason it gave for failing if it is one of `reasons`. Any other reason, or a call
// that never reached main, which ipcCall has logged, fails as `fallback`.
export async function fromMain<T, R extends string>(call: () => Promise<IpcResult<T>>, reasons: Record<R, unknown>, fallback: R): Promise<{ data: T } | { reason: R }> {
    const result = await call().catch(() => undefined);
    if (result?.status === "success") {
        return { data: result.data };
    }

    return { reason: result && result.reason in reasons ? (result.reason as R) : fallback };
}

// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { IpcResult } from "@main/typed-ipc";

// A handler returning IpcResult only covers failures main knows about. The invoke itself still
// rejects when there is no handler on the other end or main went away, and that lands in whichever
// click handler started it - Error.vue turns an escaped rejection into an unrecoverable modal.
export async function catchIpcFailure<T>(call: () => Promise<IpcResult<T>>): Promise<IpcResult<T>> {
    return call().catch((error): IpcResult<T> => {
        console.error("IPC request failed", error);

        return { status: "failed", reason: "ipc_failed", details: error instanceof Error ? error.message : String(error) };
    });
}

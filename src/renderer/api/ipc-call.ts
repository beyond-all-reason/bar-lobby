// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// A call to main that rejected, whether main threw or the invoke itself never got an answer. What the
// failure means is for logic to decide, so this only names the call that failed.
export class IpcCallError extends Error {
    readonly call: string;

    constructor(call: string, cause: unknown) {
        super(`${call} failed: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
        this.name = "IpcCallError";
        this.call = call;
    }
}

export async function ipcCall<T>(call: string, invoke: () => Promise<T>): Promise<T> {
    try {
        return await invoke();
    } catch (cause) {
        const error = new IpcCallError(call, cause);
        console.error(error);

        throw error;
    }
}

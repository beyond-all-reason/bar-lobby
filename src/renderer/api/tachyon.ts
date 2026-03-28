// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcRenderer } from "@main/typed-ipc";
import { GetCommandData, GetCommandIds, GetCommands, TachyonResponse } from "tachyon-protocol";

export type TachyonFailedResponse = Extract<TachyonResponse, { status: "failed" }>;

/**
 * Wraps a Tachyon protocol-level failed response as a proper Error subclass.
 * Only thrown when the server explicitly responds with `status: "failed"`.
 *
 * IPC/network errors (socket closed, not connected, etc.) are NOT wrapped —
 * they propagate as plain errors so callers can distinguish them from protocol failures.
 *
 * Use `isTachyonErrorForCommand` to narrow `error.response.reason` to the
 * specific command's typed reason union.
 */
export class TachyonRequestError extends Error {
    public readonly response: TachyonFailedResponse;

    constructor(response: TachyonFailedResponse) {
        super(`Tachyon request failed — ${response.commandId}: ${response.reason}${"details" in response && response.details ? ` (${response.details})` : ""}`);
        this.name = "TachyonRequestError";
        this.response = response;
    }
}

/**
 * Narrows a caught error to a TachyonRequestError for a specific command, giving a fully
 * typed `response.reason` union for that command.
 *
 * @example
 * } catch (error) {
 *   if (isTachyonErrorForCommand(error, "matchmaking/queue")) {
 *     switch (error.response.reason) { // "version_mismatch" | "already_queued" | ...
 *       case "version_mismatch": ...
 *     }
 *   }
 *  if (error instanceof TachyonRequestError) {
 *     // generic protocol failure handling
 *   }
 * }
 */
export function isTachyonErrorForCommand<C extends GetCommandIds<"user", "server", "request">>(
    error: unknown,
    commandId: C
): error is TachyonRequestError & { response: Extract<GetCommands<"server", "user", "response", C>, { status: "failed" }> } {
    return error instanceof TachyonRequestError && error.response.commandId === commandId;
}

/**
 * Renderer-side wrapper around the Tachyon request IPC.
 *
 * - Resolves with the typed success response on `status: "success"`.
 * - Rejects with {@link TachyonRequestError} when the server responds with `status: "failed"`.
 * - Lets IPC/network errors propagate as-is (not wrapped), so callers can
 *   distinguish protocol failures from infrastructure failures.
 *
 * Stores should always use this function instead of invoking the Tachyon IPC directly.
 */
export async function tachyonRequest<C extends GetCommandIds<"user", "server", "request">>(
    ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
): Promise<Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>> {
    const response = await (ipcRenderer.invoke as (channel: "tachyon:requestStructured", ...a: typeof args) => Promise<TachyonResponse>)("tachyon:requestStructured", ...args);
    if (response.status === "failed") {
        throw new TachyonRequestError(response);
    }
    return response as Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>;
}

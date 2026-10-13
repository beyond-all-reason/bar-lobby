// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { GetCommandData, GetCommandIds, GetCommands, TachyonResponse } from "tachyon-protocol";

type RequestCommandId = GetCommandIds<"user", "server", "request">;
type EventCommandId = GetCommandIds<"server", "user", "event">;
type EventData<C extends EventCommandId> = GetCommandData<GetCommands<"server", "user", "event", C>>;
type SuccessResponse<C extends RequestCommandId> = Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>;
type FailedResponse<C extends RequestCommandId> = Extract<GetCommands<"server", "user", "response", C>, { status: "failed" }>;
type AnyFailedResponse = Extract<TachyonResponse, { status: "failed" }>;

export class TachyonRequestError<C extends RequestCommandId = RequestCommandId> extends Error {
    readonly commandId: C;
    readonly reason: FailedResponse<C>["reason"];
    readonly details?: string;

    constructor(commandId: C, response: AnyFailedResponse) {
        super(`${commandId} failed: ${response.reason}` + (response.details ? ` (${response.details})` : ""));
        this.name = "TachyonRequestError";
        this.commandId = commandId;
        this.reason = response.reason as FailedResponse<C>["reason"];
        this.details = response.details;
    }
}

export class TachyonIpcError<C extends RequestCommandId = RequestCommandId> extends Error {
    readonly commandId: C;

    constructor(commandId: C, cause: unknown) {
        super(`${commandId} failed: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
        this.name = "TachyonIpcError";
        this.commandId = commandId;
    }
}

function logFailure<E extends TachyonRequestError | TachyonIpcError>(error: E): E {
    console.error(error);

    return error;
}

export async function tachyonRequest<C extends RequestCommandId>(
    ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
): Promise<SuccessResponse<C>> {
    const [commandId] = args as [C];
    const requestStructured = window.tachyon.requestStructured as (...args: unknown[]) => Promise<TachyonResponse>;

    let response: TachyonResponse;
    try {
        response = await requestStructured(...args);
    } catch (cause) {
        throw logFailure(new TachyonIpcError(commandId, cause));
    }

    if (response.status === "failed") {
        throw logFailure(new TachyonRequestError(commandId, response));
    }

    return response as SuccessResponse<C>;
}

export function isTachyonError(error: unknown): error is TachyonRequestError | TachyonIpcError {
    return error instanceof TachyonRequestError || error instanceof TachyonIpcError;
}

export function isTachyonErrorForCommand<C extends RequestCommandId>(error: unknown, commandId: C): error is TachyonRequestError<C> {
    return error instanceof TachyonRequestError && error.commandId === commandId;
}

export function onTachyonEvent<C extends EventCommandId>(commandId: C, handler: (data: EventData<C>) => void): () => void {
    return window.tachyon.onEvent(commandId, handler);
}

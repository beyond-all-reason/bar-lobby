// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { GetCommandData, GetCommandIds, GetCommands, TachyonResponse } from "tachyon-protocol";

type RequestCommandId = GetCommandIds<"user", "server", "request">;
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

export async function tachyonRequest<C extends RequestCommandId>(
    ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
): Promise<SuccessResponse<C>> {
    const [commandId] = args as [C];
    const requestStructured = window.tachyon.requestStructured as (...args: unknown[]) => Promise<TachyonResponse>;
    const response = await requestStructured(...args);
    if (response.status === "failed") {
        throw new TachyonRequestError(commandId, response);
    }

    return response as SuccessResponse<C>;
}

export function isTachyonErrorForCommand<C extends RequestCommandId>(error: unknown, commandId: C): error is TachyonRequestError<C> {
    return error instanceof TachyonRequestError && error.commandId === commandId;
}

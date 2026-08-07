// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Signal } from "$/jaz-ts-utils/signal";
import { getWSServerURL } from "@main/config/server";
import { logger } from "@main/utils/logger";
import { randomUUID } from "node:crypto";

import { GetCommandData, GetCommandIds, GetCommands, TachyonEvent, tachyonMeta, TachyonRequest, TachyonResponse } from "tachyon-protocol";
import { TachyonCommand } from "tachyon-protocol/types";
import * as validators from "tachyon-protocol/validators";
import { MessageEvent, WebSocket } from "ws";

const log = logger("tachyon-client");

type ServerToUserRequestCommandId = GetCommandIds<"server", "user", "request">;
type ServerToUserRequest<C extends ServerToUserRequestCommandId = ServerToUserRequestCommandId> = GetCommands<"server", "user", "request", C>;
type StripEnvelope<T> = T extends object ? Omit<T, "type" | "commandId" | "messageId"> : never;
type UserToServerResponseBody<C extends ServerToUserRequestCommandId = ServerToUserRequestCommandId> = StripEnvelope<GetCommands<"user", "server", "response", C>>;
type AnyUserToServerResponseBody = UserToServerResponseBody<ServerToUserRequestCommandId>;

export type TachyonClientRequestHandlers = {
    [CommandId in ServerToUserRequestCommandId]: (data: GetCommandData<ServerToUserRequest<CommandId>>) => Promise<UserToServerResponseBody<CommandId>>;
};

class InternalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InternalError";
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}

class UnimplementedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnimplementedError";
        Object.setPrototypeOf(this, UnimplementedError.prototype);
    }
}

export class TachyonClient {
    public socket?: WebSocket;

    public onSocketOpen: Signal<void> = new Signal();
    public onSocketClose: Signal<void> = new Signal();
    public onEvent: Signal<TachyonEvent> = new Signal();

    private requestHandlers: TachyonClientRequestHandlers;
    private responseHandlers: Map<string, (response: TachyonResponse | { status: "socket_closed" }) => void> = new Map();

    constructor(requestHandlers: TachyonClientRequestHandlers) {
        this.requestHandlers = requestHandlers;
    }

    public async connect(token: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket && this.socket.readyState === this.socket.OPEN) {
                log.warn(`Already connected`);
                reject("already_connected");
                return;
            }
            let serverProtocol: string | undefined;
            this.socket = new WebSocket(getWSServerURL(), `v0.tachyon`, {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            this.socket.on("unexpected-response", async (req, res) => {
                res.on("data", (chunk: Buffer) => {
                    const error = chunk.toString();
                    log.error(`HTTP Error ${res.statusCode}: ${error}`);
                    try {
                        const errorObject = JSON.parse(error);
                        reject(new Error(errorObject.error_description || errorObject.error || "Unknown error"));
                    } catch {
                        reject(new Error("Unknown error"));
                    }
                });
            });
            this.socket.on("upgrade", (response) => {
                serverProtocol = response.headers["sec-websocket-protocol"];
            });
            this.socket.addEventListener("message", (message) => {
                try {
                    this.handleMessage(message);
                } catch (err) {
                    log.error(`Error handling message: ${err}`);
                    log.error(message.data.toString());
                }
            });
            this.socket.addEventListener("open", async () => {
                log.info(`Connected to ${getWSServerURL()} using Tachyon Version ${tachyonMeta.version}`);
                this.onSocketOpen.dispatch();
                resolve();
            });
            let disconnectReason: string;
            this.socket.addEventListener("close", (event) => {
                if (!disconnectReason) {
                    if (event.reason.toString()) {
                        disconnectReason = event.reason.toString();
                    } else if (event.code === 1006) {
                        disconnectReason = "Lost connection to server";
                    } else if (event.code) {
                        disconnectReason = event.code.toString();
                    } else {
                        disconnectReason = "Unknown server error";
                    }
                }
                this.socket = undefined;
                // Purge response handlers
                this.responseHandlers.values().forEach((handler) =>
                    handler({
                        status: "socket_closed",
                    })
                );
                this.responseHandlers.clear();
                this.onSocketClose.dispatch();
                log.info(`Disconnected: ${disconnectReason}`);
            });
            this.socket.addEventListener("error", (err) => {
                if (err.message.includes("invalid subprotocol")) {
                    disconnectReason = `Tachyon server protocol version (${serverProtocol}) is incompatible with this client (tachyon-${tachyonMeta.version})`;
                } else if (err.message.includes("ECONNREFUSED")) {
                    disconnectReason = `Could not connect to server at ${getWSServerURL()}`;
                } else {
                    disconnectReason = err.message;
                }
                reject(disconnectReason);
            });
        });
    }

    private async sendRequest(commandId: string, data?: unknown): Promise<TachyonResponse> {
        if (!this.socket) {
            throw new Error("Not connected to server");
        }
        const messageId = randomUUID();
        const request = {
            type: "request",
            commandId,
            messageId,
        } as TachyonRequest;
        if (data) {
            Object.assign(request, { data });
        }
        try {
            validateMessage(request, "command");
            this.socket.send(JSON.stringify(request));
        } catch (error) {
            log.error(`Failed to send request ${commandId}: ${error}`);
            throw error;
        }
        return new Promise((resolve, reject) => {
            this.responseHandlers.set(messageId, (response: TachyonResponse | { status: "socket_closed" }) => {
                if (response.status === "socket_closed") {
                    log.error(`No response received for request ${commandId}`);
                    reject(new Error(`No response received for request ${commandId}, socket closed.`));
                    return;
                }
                if (response.status === "failed") {
                    log.error(`Error response received: ${JSON.stringify(response)}`);
                }
                resolve(response);
            });
        });
    }

    public async requestStructured<C extends GetCommandIds<"user", "server", "request">>(
        ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
    ): Promise<GetCommands<"server", "user", "response", C>> {
        const [commandId, data] = args as [C, unknown];
        const response = await this.sendRequest(commandId, data);

        return response as GetCommands<"server", "user", "response", C>;
    }

    public async request<C extends GetCommandIds<"user", "server", "request">>(
        ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
    ): Promise<Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>> {
        const [commandId, data] = args as [C, unknown];
        const response = await this.sendRequest(commandId, data);
        if (response.status === "failed") {
            throw new Error(`${response.reason}` + (response.details ? ` (${response.details})` : ""));
        }

        return response as Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>;
    }

    public sendEvent(event: TachyonEvent) {
        if (!this.socket) {
            throw new Error("Not connected to server");
        }
        try {
            validateMessage(event, "command");
            this.socket.send(JSON.stringify(event));
        } catch (error) {
            log.error(`Failed to send event ${event.commandId}: ${error}`);
            throw error;
        }
    }

    protected handleMessage(message: MessageEvent) {
        const obj = JSON.parse(message.data.toString());
        if (!isCommand(obj)) {
            throw new Error(`Message does not match expected command structure`);
        }
        if (obj.type === "request") {
            this.handleRequest(obj as ServerToUserRequest);
        } else if (obj.type === "response") {
            this.handleResponse(obj);
        } else if (obj.type === "event") {
            this.handleEvent(obj);
        } else {
            throw new Error(`Unknown command type: ${obj.type}`);
        }
    }

    private async handleRequest(command: TachyonRequest) {
        const commandId = command.commandId as ServerToUserRequestCommandId;
        const handler = this.requestHandlers[commandId] as ((data?: unknown) => Promise<AnyUserToServerResponseBody>) | undefined;
        const requestData = "data" in command ? command.data : undefined;

        let handlerResponse: AnyUserToServerResponseBody;
        if (!handler) {
            log.warn(`No response handler found for: ${commandId}`);
            handlerResponse = {
                status: "failed",
                reason: "command_unimplemented",
                details: `No response handler found for: ${commandId}`,
            } as AnyUserToServerResponseBody;
        } else {
            try {
                handlerResponse = await handler(requestData);
            } catch (error) {
                log.error(`Error handling request for request ${commandId}: ${error}`);
                handlerResponse = {
                    status: "failed",
                    reason: "internal_error",
                    details: error instanceof Error ? error.message : "Unknown error occurred",
                } as AnyUserToServerResponseBody;
            }
        }

        const response = {
            type: "response",
            commandId,
            messageId: command.messageId,
            ...handlerResponse,
        } as TachyonResponse;

        try {
            validateMessage(response, "response");
            this.socket?.send(JSON.stringify(response));
        } catch (err) {
            let reason = "internal_error";
            let details = err instanceof Error ? err.message : "Unknown error occurred";

            if (err instanceof UnimplementedError) {
                reason = "command_unimplemented";
            } else if (err instanceof InternalError) {
                reason = "internal_error";
            } else {
                log.error("Unexpected error during response handling:", err);
                reason = "internal_error";
                details = "An unexpected validation lifecycle error occurred.";
            }

            this.socket?.send(
                JSON.stringify({
                    type: "response",
                    commandId,
                    messageId: command.messageId,
                    status: "failed",
                    reason,
                    details,
                } as TachyonResponse)
            );
        }
    }

    private async handleResponse(response: TachyonResponse) {
        const handler = this.responseHandlers.get(response.messageId);
        if (!handler) {
            log.error(`No response handler found for request ${response.messageId}`);
            return;
        }
        this.responseHandlers.delete(response.messageId);
        handler(response);
    }

    private async handleEvent(event: TachyonEvent) {
        this.onEvent.dispatch(event);
    }

    public isConnected(): boolean {
        if (!this.socket) {
            return false;
        }
        return this.socket.readyState === this.socket.OPEN;
    }

    public async disconnect() {
        try {
            await this.request("system/disconnect");
        } catch (e) {
            log.error(`Error sending disconnect command: ${e}`);
        } finally {
            this.socket?.close();
        }
    }
}

function validateMessage(message: TachyonCommand, context: "command" | "response") {
    const commandId = message.commandId;

    const validatorId = `${commandId}/${message.type}`.replaceAll("/", "_") as Exclude<keyof typeof validators, "validator">;

    const validator = validators[validatorId];

    if (!validator) {
        throw new UnimplementedError(`No validator found with id: ${validatorId}`);
    }

    const isValid = validator(message);
    if (!isValid) {
        log.error(validator.errors);
        throw new InternalError(`${context === "command" ? "Command" : "Response"} validation failed for: ${commandId}`);
    }
}

function isCommand(obj: unknown): obj is TachyonCommand {
    return typeof obj === "object" && obj !== null && "commandId" in obj && "messageId" in obj && "type" in obj;
}

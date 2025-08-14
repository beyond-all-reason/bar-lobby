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

export type TachyonClientRequestHandlers = {
    [CommandId in GetCommandIds<"server", "user", "request">]: (
        data: GetCommandData<GetCommands<"server", "user", "request", CommandId>>
    ) => Promise<Omit<GetCommands<"user", "server", "response", CommandId>, "type" | "commandId" | "messageId">>;
};

export class TachyonClient {
    public socket?: WebSocket;

    public onSocketOpen: Signal<void> = new Signal();
    public onSocketClose: Signal<void> = new Signal();
    public onEvent: Signal<TachyonEvent> = new Signal();

    private requestHandlers: TachyonClientRequestHandlers;
    private responseHandlers: Map<string, (response: TachyonResponse) => void> = new Map();

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

    public async request<C extends GetCommandIds<"user", "server", "request">>(
        ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
    ): Promise<Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>> {
        if (!this.socket) {
            throw new Error("Not connected to server");
        }
        const [commandId, data] = args as [C, GetCommandData<GetCommands<"user", "server", "request", C>> | undefined];
        const messageId = randomUUID();
        const request = {
            type: "request",
            commandId,
            messageId,
        } as GetCommands<"user", "server", "request", C>;
        if (data) {
            Object.assign(request, { data });
        }
        validateCommand(request);
        this.socket.send(JSON.stringify(request));
        return new Promise((resolve, reject) => {
            this.responseHandlers.set(messageId, (response: TachyonResponse) => {
                if (response.status === "failed") {
                    log.error(`Error response received: ${JSON.stringify(response)}`);
                    reject(new Error(`${response.reason}` + (response.details ? ` (${response.details})` : "")));
                }
                resolve(response as Extract<GetCommands<"server", "user", "response", C>, { status: "success" }>);
            });
        });
    }

    public sendEvent(event: TachyonEvent) {
        if (!this.socket) {
            throw new Error("Not connected to server");
        }
        validateCommand(event);
        this.socket.send(JSON.stringify(event));
    }

    protected handleMessage(message: MessageEvent) {
        const obj = JSON.parse(message.data.toString());
        if (!isCommand(obj)) {
            throw new Error(`Message does not match expected command structure`);
        }
        if (obj.type === "request") {
            this.handleRequest(obj);
        } else if (obj.type === "response") {
            this.handleResponse(obj);
        } else if (obj.type === "event") {
            this.handleEvent(obj);
        } else {
            throw new Error(`Unknown command type: ${obj.type}`);
        }
    }

    private async handleRequest(command: TachyonRequest) {
        const handler = this.requestHandlers[command.commandId as keyof typeof this.requestHandlers] as unknown as (
            data?: unknown
        ) => Promise<Omit<TachyonResponse, "type" | "commandId" | "messageId">>;
        if (!handler) {
            throw new Error(`No response handler found for: ${command.commandId}`);
        }
        const handlerResponse = await handler("data" in command ? command.data : undefined);
        const response = {
            type: "response",
            commandId: command.commandId,
            messageId: command.messageId,
            ...handlerResponse,
        } as TachyonResponse;
        validateCommand(response);
        this.socket?.send(JSON.stringify(response));
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

function validateCommand(command: TachyonCommand) {
    const commandId = command.commandId;
    const validatorId = `${commandId}/${command.type}`.replaceAll("/", "_") as Exclude<keyof typeof validators, "validator">;
    const validator = validators[validatorId];
    if (!validator) {
        throw new Error(`No validator found with id: ${validatorId}`);
    }
    const isValid = validator(command);
    if (!isValid) {
        log.error(validator.errors);
        throw new Error(`Command validation failed for: ${commandId}`);
    }
}

function isCommand(obj: unknown): obj is TachyonCommand {
    return typeof obj === "object" && obj !== null && "commandId" in obj && "messageId" in obj && "type" in obj;
}

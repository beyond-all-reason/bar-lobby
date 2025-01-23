import { Signal } from "$/jaz-ts-utils/signal";
import { WS_SERVER_URL } from "@main/config/server";
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
    private responseHandlers: Map<string, Signal<GetCommands<"server", "user", "response">>> = new Map();

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
            this.socket = new WebSocket(WS_SERVER_URL, `v0.tachyon`, {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            this.socket.on("unexpected-response", async (req, res) => {
                res.on("data", (chunk: Buffer) => {
                    const error = `HTTP Error ${res.statusCode}: ${chunk.toString()}`;
                    log.error(error);
                    reject(error);
                });
            });
            this.socket.on("upgrade", (response) => {
                serverProtocol = response.headers["sec-websocket-protocol"];
            });
            this.socket.addEventListener("message", (message) => {
                log.debug(`SOCKET INCOMING MESSAGE ${JSON.stringify(message)}`);
                try {
                    this.handleMessage(message);
                } catch (err) {
                    log.error(`Error handling message: ${err}`);
                    log.error(message.data.toString());
                }
            });
            this.socket.addEventListener("open", async () => {
                log.info(`Connected to ${WS_SERVER_URL} using Tachyon Version ${tachyonMeta.version}`);
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
                    disconnectReason = `Could not connect to server at ${WS_SERVER_URL}`;
                } else {
                    disconnectReason = err.message;
                }
                reject(disconnectReason);
            });
        });
    }

    public async request<C extends GetCommandIds<"user", "server", "request">>(
        ...args: GetCommandData<GetCommands<"user", "server", "request", C>> extends never ? [commandId: C] : [commandId: C, data: GetCommandData<GetCommands<"user", "server", "request", C>>]
    ): Promise<GetCommands<"server", "user", "response", C>> {
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
        log.debug(`OUTGOING REQUEST ${JSON.stringify(request)}`);
        return new Promise((resolve) => {
            this.onResponse(commandId).addOnce((response: TachyonResponse) => {
                if (response.messageId === messageId) {
                    resolve(response as GetCommands<"server", "user", "response", C>);
                }
            });
        });
    }

    public sendEvent(event: TachyonEvent) {
        if (!this.socket) {
            throw new Error("Not connected to server");
        }
        validateCommand(event);
        this.socket.send(JSON.stringify(event));
        log.debug(`OUTGOING EVENT ${JSON.stringify(event)}`);
    }

    // public nextEvent<C extends GetCommandIds<"server", "user", "event">>(commandId: C): Promise<GetCommandData<GetCommands<"server", "user", "event", C>>> {
    //     return new Promise((resolve) => {
    //         let signal = this.eventHandlers.get(commandId);
    //         if (!signal) {
    //             signal = new Signal();
    //             this.eventHandlers.set(commandId, signal);
    //         }
    //         signal.addOnce((event) => {
    //             resolve((event as { data: GetCommandData<GetCommands<"server", "user", "event", C>> }).data);
    //         });
    //     });
    // }

    public onResponse(commandId: GetCommandIds<"server", "user", "response">) {
        let signal = this.responseHandlers.get(commandId);
        if (!signal) {
            signal = new Signal();
            this.responseHandlers.set(commandId, signal);
        }
        return signal;
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

    protected async handleRequest(command: TachyonRequest) {
        log.debug("INCOMING REQUEST", command);
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
        log.debug(`OUTGOING RESPONSE ${JSON.stringify(response)}`);
    }

    protected async handleResponse(response: TachyonResponse) {
        log.debug(`INCOMING RESPONSE ${JSON.stringify(response)}`);
        const signal = this.responseHandlers.get(response.commandId);
        if (signal) {
            signal.dispatch(response as GetCommands<"server", "user", "response">);
        }
    }

    protected async handleEvent(event: TachyonEvent) {
        log.debug(`INCOMING EVENT ${JSON.stringify(event)}`);
        this.onEvent.dispatch(event);
    }

    public isConnected(): boolean {
        if (!this.socket) {
            return false;
        }
        return this.socket.readyState === this.socket.OPEN;
    }

    public disconnect() {
        this.socket?.close();
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

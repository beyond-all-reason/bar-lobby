import { Signal } from "jaz-ts-utils";
import { type RequestData, type RequestEndpointId, type ResponseEndpointId, type ResponseType, type ServiceId, getValidator, SuccessResponseData, tachyonMeta } from "tachyon-protocol";
import { ClientOptions, WebSocket } from "ws";

/*
 * This whole file should be deliberately kept separate from the rest of the codebase because it is intended to be usable by projects other than this lobby.
 * It's only here for now for ease of development, but once network comms are stable then this file should be deleted and moved to the tachyon-client package instead.
 */

export interface TachyonClientOptions extends ClientOptions {
    host: string;
    port?: number;
    ssl?: boolean;
    logging?: boolean;
}

export class TachyonClient {
    public socket?: WebSocket;
    public config: TachyonClientOptions;

    protected responseSignals: Map<string, Signal> = new Map();

    constructor(config: TachyonClientOptions) {
        this.config = config;
    }

    public async connect(steamSessionTicket: string): Promise<SuccessResponseData<"system", "connected">> {
        return new Promise((resolve, reject) => {
            if (this.socket && this.socket.readyState === this.socket.OPEN) {
                reject("already_connected");
            } else {
                const wsPrefix = this.config.ssl ? "wss" : "ws";
                let serverProtocol: string | undefined;

                this.socket = new WebSocket(`${wsPrefix}://${this.getServerBaseUrl()}`, `tachyon-${tachyonMeta.version}`, {
                    ...this.config,
                    headers: {
                        authorization: `Basic ${steamSessionTicket}`,
                    },
                });

                this.socket.on("upgrade", (response) => {
                    serverProtocol = response.headers["sec-websocket-protocol"];
                });

                this.socket.addEventListener("message", (message) => {
                    const response = JSON.parse(message.toString());

                    if (this.config.logging) {
                        console.log("RESPONSE", response);
                    }

                    const commandId: string = response.command;
                    if (!commandId || typeof commandId !== "string") {
                        throw new Error(`Invalid command received`);
                    }

                    const validator = getValidator(response);
                    const isValid = validator(response);
                    if (!isValid) {
                        console.error(`Command validation failed for ${commandId}`);
                        if (validator.errors) {
                            for (const error of validator.errors) {
                                console.error(error);
                            }
                        }
                    }

                    const signal = this.responseSignals.get(response.command);
                    if (signal) {
                        signal.dispatch(response);
                    }
                });

                this.socket.addEventListener("open", async () => {
                    if (this.config.logging) {
                        console.log(`Connected to ${this.getServerBaseUrl()} using Tachyon Version ${tachyonMeta.version}`);
                    }
                });

                this.socket.addEventListener("close", (event) => {
                    if (this.config.logging) {
                        console.log(`Disconnected from ${this.getServerBaseUrl()} (${event.reason.toString() ?? event.code})`);
                    }

                    this.responseSignals.forEach((signal) => signal.disposeAll());
                    this.responseSignals.clear();
                    this.socket = undefined;
                });

                this.socket.addEventListener("error", (err) => {
                    if (err instanceof Error && err.message === "Server sent an invalid subprotocol") {
                        reject(`Tachyon server protocol version (${serverProtocol}) is incompatible with this client (tachyon-${tachyonMeta.version})`);
                    } else if (err.message.includes("ECONNREFUSED")) {
                        reject(`Could not connect to server at ${this.getServerBaseUrl()}`);
                    } else {
                        reject(err);
                    }
                });

                this.on("system", "connected").add((response) => {
                    if (response.status === "success") {
                        resolve(response.data);
                    } else {
                        reject(response.reason);
                    }
                });
            }
        });
    }

    public request<S extends ServiceId, E extends RequestEndpointId<S> & ResponseEndpointId<S>>(serviceId: S, endpointId: E & string, data: RequestData<S, E>): Promise<ResponseType<S, E>> {
        return new Promise((resolve) => {
            const commandId = `${serviceId}/${endpointId}/request`;
            const request = {
                command: commandId,
                data,
            };

            const validator = getValidator(request);
            const isValid = validator(request);
            if (!isValid) {
                console.error(`Command validation failed for ${commandId}`);
                if (validator.errors) {
                    for (const error of validator.errors) {
                        console.error(error);
                    }
                }
            }

            this.on(serviceId, endpointId).addOnce((data) => {
                resolve(data);
            });

            this.socket?.send(JSON.stringify(request));

            if (this.config.logging) {
                console.log("REQUEST", request);
            }
        });
    }

    public on<S extends ServiceId, E extends ResponseEndpointId<S>>(serviceId: S, endpointId: E): Signal<ResponseType<S, E>> {
        const commandId = `${serviceId}/${endpointId.toString()}/response`;
        let signal = this.responseSignals.get(commandId);
        if (!signal) {
            signal = new Signal();
            this.responseSignals.set(commandId, signal);
        }

        return signal;
    }

    public waitFor<S extends ServiceId, E extends ResponseEndpointId<S>>(serviceId: S, endpointId: E): Promise<ResponseType<S, E>> {
        return new Promise((resolve) => {
            this.on(serviceId, endpointId).addOnce((data) => {
                resolve(data);
            });
        });
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

    protected getServerBaseUrl() {
        const port = this.config.port ? ":" + this.config.port : "";
        return `${this.config.host}${port}`;
    }
}

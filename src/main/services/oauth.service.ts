// Helper for handling OAuth2 redirects from the native application.

// This is a very simple HTTP server that listens on a random port on localhost
// and returns the URL that it is listening on. It also handles a request to
// specific path and returns the URL that was requested.

// https://www.rfc-editor.org/rfc/rfc8252#section-8.3
// https://datatracker.ietf.org/doc/html/rfc8252#section-7.3

import http from "node:http";
import { AddressInfo } from "node:net";

export class RedirectHandler {
    private path: string;
    private server: http.Server;
    private error?: Error;
    private callbackUrl?: URL;

    constructor(signal?: AbortSignal) {
        this.path = "/oauth2callback";

        this.server = http.createServer((req, res) => this.handleRequest(req, res));

        // We don't just set the signal on the server, because we want to be
        // able to force close all the connections when we are done.
        signal?.addEventListener("abort", () => this.close());

        this.server.on("error", (err) => {
            this.error = err;
            this.close();
        });

        this.server.listen({
            port: 0,
            host: "127.0.0.1", // We assume that IPv4 is always available
        });
    }

    public close() {
        this.server.close();
        this.server.closeAllConnections();
    }

    public async getRedirectUrl(): Promise<string> {
        if (this.error) {
            throw this.error;
        }
        if (!this.server.listening) {
            await new Promise<void>((resolve, reject) => {
                this.server.once("listening", resolve);
                this.server.once("error", reject);
                this.server.once("close", () => reject(new Error("Server closed before listening")));
            });
        }
        const address = this.server.address() as AddressInfo;
        return `http://${address.address}:${address.port}${this.path}`;
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        if (url.pathname !== this.path) {
            res.writeHead(404);
            res.end();
            return;
        }
        this.callbackUrl = url;
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("You can close this window now.");
    }

    public async waitForCallback(): Promise<URL> {
        if (this.error) {
            throw this.error;
        }

        if (!this.server.listening) {
            throw new Error("Server is not listening, how did you get redirect url?");
        }

        if (!this.callbackUrl) {
            await new Promise<void>((resolve, reject) => {
                const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
                    // The callbackUrl is set in the handleRequest method and
                    // we depend on the event listeners order to check it here.
                    if (this.callbackUrl) {
                        this.server.removeListener("request", handler);
                        resolve();
                    }
                };
                this.server.on("request", handler);
                this.server.once("error", reject);
                this.server.once("close", () => reject(new Error("Server closed before callback")));
            });
        }

        if (!this.callbackUrl) {
            throw new Error("Unknown error while waiting for callback");
        }

        return this.callbackUrl;
    }
}

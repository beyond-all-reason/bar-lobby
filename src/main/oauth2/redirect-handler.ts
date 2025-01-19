// Helper for handling OAuth2 redirects from the native application.

// This is a very simple HTTP server that listens on a random port on localhost
// and returns the URL that it is listening on. It also handles a request to
// specific path and returns the URL that was requested.

// https://www.rfc-editor.org/rfc/rfc8252#section-8.3
// https://datatracker.ietf.org/doc/html/rfc8252#section-7.3

import { logger } from "@main/utils/logger";
import http from "node:http";
import { AddressInfo } from "node:net";

const TIMEOUT = 60 * 1000; // 1 minute
const log = logger("redirect-handler");

export default class RedirectHandler {
    private path: string;
    private server: http.Server;
    private callbackUrl?: URL;

    constructor() {
        this.path = "/oauth2callback";
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
        this.server.on("error", (err) => {
            log.error("Error in redirect handler server", err);
            this.close();
        });
    }

    public close() {
        this.server.close();
        this.server.closeAllConnections();
    }

    public async start(): Promise<string> {
        // Times out after some time to prevent leaving a running server in case of
        // some error in the application, the user interrupting the flow etc...
        setTimeout(() => this.close(), TIMEOUT);
        this.server.listen({
            port: 0,
            host: "127.0.0.1", // We assume that IPv4 is always available
        });
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
        if (!this.server.listening) {
            throw new Error("Server is not listening, how did you get redirect url?");
        }
        if (!this.callbackUrl) {
            await new Promise<void>((resolve, reject) => {
                const handler = () => {
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

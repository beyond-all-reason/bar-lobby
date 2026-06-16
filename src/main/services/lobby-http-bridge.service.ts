// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import http from "node:http";
import { LOBBY_PROTOCOL_SCHEME } from "@main/lobbyProtocol/scheme";
import { logger } from "@main/utils/logger";

const log = logger("lobby-http-bridge.service.ts");

const PORT = 47777;

function buildRedirectHtml(protocolUrl: string): string {
    const escaped = protocolUrl.replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=${escaped}">
  <script>window.location.replace(${JSON.stringify(protocolUrl)});</script>
  <title>Opening BAR Lobby...</title>
</head>
<body>
  <p>Opening BAR Lobby...</p>
  <p>If the app didn't open, <a href="${escaped}">click here</a>.</p>
</body>
</html>`;
}

let server: http.Server | null = null;

function init(): Promise<void> {
    return new Promise((resolve) => {
        server = http.createServer((req, res) => {
            if (req.method !== "GET") {
                res.writeHead(405).end();
                return;
            }

            let parsedUrl: URL;
            try {
                parsedUrl = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
            } catch {
                res.writeHead(400).end();
                return;
            }

            const segments = parsedUrl.pathname.split("/").filter(Boolean);
            if (segments.length !== 3 || segments[0] !== "run") {
                res.writeHead(404).end("Not found");
                return;
            }

            const [, handler, action] = segments;
            const protocolUrl = `${LOBBY_PROTOCOL_SCHEME}://${handler}/${action}${parsedUrl.search}`;

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(buildRedirectHtml(protocolUrl));
        });

        server.on("error", (err) => {
            log.warn(`HTTP bridge failed to start: ${err.message}`);
            server = null;
            resolve();
        });

        server.listen(PORT, "127.0.0.1", () => {
            log.info(`HTTP bridge listening on http://localhost:${PORT}`);
            resolve();
        });
    });
}

function close(): void {
    server?.close();
    server = null;
}

export const lobbyHttpBridgeService = { init, close };

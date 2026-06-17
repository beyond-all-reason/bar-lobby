// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import http from "node:http";
import { buildLobbyProtocolUrl } from "@main/lobbyProtocol/lobby-protocol-router";
import { logger } from "@main/utils/logger";
import { lobbyProtocolLaunchService } from "./lobby-protocol-launch.service";

const log = logger("lobby-http-bridge.service.ts");

const PORT = 47777;

function buildOpenHtml(protocolUrl: string): string {
    const escaped = protocolUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `<!DOCTYPE html>
<html>
<head>
  <title>Opening BAR Lobby...</title>
</head>
<body>
  <p>Opening BAR Lobby...</p>
  <p>If the app did not open, <a href="${escaped}">click here</a>.</p>
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
            const protocolUrl = buildLobbyProtocolUrl(handler, action, parsedUrl.search);
            void lobbyProtocolLaunchService.openExternal(protocolUrl);

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(buildOpenHtml(protocolUrl));
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

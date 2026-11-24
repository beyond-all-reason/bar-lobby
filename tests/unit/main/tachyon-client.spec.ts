// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocketServer } from "ws";

const { wsUrl } = vi.hoisted(() => ({ wsUrl: { value: "" } }));

vi.mock("@main/config/server", () => ({ getWSServerURL: () => wsUrl.value }));

const { TachyonClient } = await import("@main/tachyon/tachyon-client");

describe("TachyonClient.connect", () => {
    let server: Server | undefined;

    afterEach(async () => {
        await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
        server = undefined;
    });

    async function startServer(rejectFirst: number, rejectBody: string) {
        let hits = 0;
        const wss = new WebSocketServer({ noServer: true, handleProtocols: () => "v0.tachyon" });
        server = createServer();
        server.on("upgrade", (req, socket, head) => {
            hits++;
            if (hits <= rejectFirst) {
                socket.end(`HTTP/1.1 429 Too Many Requests\r\nContent-Length: ${rejectBody.length}\r\nConnection: close\r\n\r\n${rejectBody}`);
                return;
            }
            wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
        });
        await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
        wsUrl.value = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/tachyon`;
    }

    it("can connect again after the handshake got a non-101 response", async () => {
        await startServer(1, JSON.stringify({ error: "rate_limited" }));
        const client = new TachyonClient({} as never);

        await expect(client.connect("token")).rejects.toThrow("rate_limited");
        await expect(client.connect("token")).resolves.toBeUndefined();

        client.socket?.close();
    });

    it("rejects and can retry when the non-101 response has no body", async () => {
        await startServer(1, "");
        const client = new TachyonClient({} as never);

        await expect(client.connect("token")).rejects.toThrow("Unknown error");
        await expect(client.connect("token")).resolves.toBeUndefined();

        client.socket?.close();
    });
});

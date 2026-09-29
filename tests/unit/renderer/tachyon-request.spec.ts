// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { isTachyonErrorForCommand, TachyonRequestError, tachyonRequest } from "@renderer/api/tachyon";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const requestStructured = vi.fn();
window.tachyon.requestStructured = requestStructured as unknown as typeof window.tachyon.requestStructured;

describe("tachyonRequest", () => {
    let consoleError: MockInstance<typeof console.error>;

    beforeEach(() => {
        requestStructured.mockReset();
        consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleError.mockRestore();
    });

    it("returns the success response", async () => {
        const response = { type: "response", commandId: "matchmaking/cancel", messageId: "1", status: "success" };
        requestStructured.mockResolvedValue(response);

        await expect(tachyonRequest("matchmaking/cancel")).resolves.toBe(response);
    });

    it("throws a TachyonRequestError carrying the reason and details", async () => {
        requestStructured.mockResolvedValue({
            type: "response",
            commandId: "matchmaking/queue",
            messageId: "1",
            status: "failed",
            reason: "version_mismatch",
            details: "queue was updated",
        });

        const error = await tachyonRequest("matchmaking/queue", { queues: [{ id: "1v1", version: "2" }] }).catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TachyonRequestError);
        expect((error as TachyonRequestError).reason).toBe("version_mismatch");
        expect((error as TachyonRequestError).details).toBe("queue was updated");
    });

    it("only matches the command the error came from", async () => {
        requestStructured.mockResolvedValue({
            type: "response",
            commandId: "matchmaking/queue",
            messageId: "1",
            status: "failed",
            reason: "version_mismatch",
        });

        const error = await tachyonRequest("matchmaking/queue", { queues: [{ id: "1v1", version: "2" }] }).catch((error: unknown) => error);

        expect(isTachyonErrorForCommand(error, "matchmaking/queue")).toBe(true);
        expect(isTachyonErrorForCommand(error, "matchmaking/cancel")).toBe(false);
    });

    it("leaves IPC errors alone", async () => {
        requestStructured.mockRejectedValue(new Error("Not connected to server"));

        const error = await tachyonRequest("matchmaking/cancel").catch((error: unknown) => error);

        expect(error).toBeInstanceOf(Error);
        expect(isTachyonErrorForCommand(error, "matchmaking/cancel")).toBe(false);
    });

    it("logs a failed response before throwing it", async () => {
        requestStructured.mockResolvedValue({ type: "response", commandId: "matchmaking/cancel", messageId: "1", status: "failed", reason: "internal_error" });

        const error = await tachyonRequest("matchmaking/cancel").catch((error: unknown) => error);

        expect(consoleError).toHaveBeenCalledWith("Tachyon error: matchmaking/cancel:", error);
    });

    it("logs IPC errors before passing them on", async () => {
        const ipcError = new Error("Not connected to server");
        requestStructured.mockRejectedValue(ipcError);

        await expect(tachyonRequest("matchmaking/cancel")).rejects.toBe(ipcError);

        expect(consoleError).toHaveBeenCalledWith("Tachyon error: matchmaking/cancel:", ipcError);
    });

    it("logs nothing on success", async () => {
        requestStructured.mockResolvedValue({ type: "response", commandId: "matchmaking/cancel", messageId: "1", status: "success" });

        await tachyonRequest("matchmaking/cancel");

        expect(consoleError).not.toHaveBeenCalled();
    });
});

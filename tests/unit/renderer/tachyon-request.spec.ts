// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { isTachyonError, isTachyonErrorForCommand, TachyonIpcError, TachyonRequestError, tachyonRequest } from "@renderer/api/tachyon";
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

    it("wraps IPC errors in a TachyonIpcError carrying the command and the original error", async () => {
        const ipcError = new Error("Not connected to server");
        requestStructured.mockRejectedValue(ipcError);

        const error = await tachyonRequest("matchmaking/cancel").catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TachyonIpcError);
        expect((error as TachyonIpcError).commandId).toBe("matchmaking/cancel");
        expect((error as TachyonIpcError).cause).toBe(ipcError);
        expect(isTachyonErrorForCommand(error, "matchmaking/cancel")).toBe(false);
    });

    it("logs a failed response", async () => {
        requestStructured.mockResolvedValue({ type: "response", commandId: "matchmaking/cancel", messageId: "1", status: "failed", reason: "internal_error" });

        const error = await tachyonRequest("matchmaking/cancel").catch((error: unknown) => error);

        expect(consoleError).toHaveBeenCalledWith(error);
    });

    it("logs IPC errors", async () => {
        requestStructured.mockRejectedValue(new Error("Not connected to server"));

        const error = await tachyonRequest("matchmaking/cancel").catch((error: unknown) => error);

        expect(consoleError).toHaveBeenCalledWith(error);
    });

    it("logs nothing on success", async () => {
        requestStructured.mockResolvedValue({ type: "response", commandId: "matchmaking/cancel", messageId: "1", status: "success" });

        await tachyonRequest("matchmaking/cancel");

        expect(consoleError).not.toHaveBeenCalled();
    });
});

describe("isTachyonError", () => {
    it("matches both kinds of tachyonRequest failure", () => {
        const failed = { type: "response", commandId: "matchmaking/cancel", messageId: "1", status: "failed", reason: "internal_error" } as const;

        expect(isTachyonError(new TachyonRequestError("matchmaking/cancel", failed))).toBe(true);
        expect(isTachyonError(new TachyonIpcError("matchmaking/cancel", new Error("Not connected to server")))).toBe(true);
    });

    it("leaves other errors out", () => {
        expect(isTachyonError(new Error("No active vote to cancel"))).toBe(false);
    });
});

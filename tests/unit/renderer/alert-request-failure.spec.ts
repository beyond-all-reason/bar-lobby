// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const { notificationsApi } = await import("@renderer/api/notifications");
const { TachyonIpcError, TachyonRequestError } = await import("@renderer/api/tachyon");
const { alertRequestFailure } = await import("@renderer/utils/alert-request-failure");

describe("alertRequestFailure", () => {
    let consoleError: MockInstance<typeof console.error>;

    beforeEach(() => {
        vi.mocked(notificationsApi.alert).mockClear();
        consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleError.mockRestore();
    });

    it("names the command the server refused", () => {
        const failed = { type: "response", commandId: "party/create", messageId: "1", status: "failed", reason: "internal_error" } as const;

        alertRequestFailure(new TachyonRequestError("party/create", failed), "party/invite");

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text: "Error with request party/create", severity: "error" });
        expect(consoleError).not.toHaveBeenCalled();
    });

    it("names the command whose IPC call failed", () => {
        alertRequestFailure(new TachyonIpcError("party/invite", new Error("Not connected to server")), "party/create");

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text: "Error with request party/invite", severity: "error" });
        expect(consoleError).not.toHaveBeenCalled();
    });

    it("logs other errors and falls back to the command it was given", () => {
        const error = new TypeError("Cannot read properties of undefined");

        alertRequestFailure(error, "party/invite");

        expect(consoleError).toHaveBeenCalledWith("Error with request party/invite", error);
        expect(notificationsApi.alert).toHaveBeenCalledWith({ text: "Error with request party/invite", severity: "error" });
    });
});

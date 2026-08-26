// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcResult } from "@main/typed-ipc";

const alert = vi.hoisted(() => vi.fn());

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert } }));
vi.mock("@renderer/i18n", () => ({ setupI18n: () => ({ global: { t: (key: string, params: Record<string, string>) => `${key}:${params.details}` } }) }));

const { shellApi } = await import("@renderer/api/shell");

const openReplaysDir = vi.fn();

Object.defineProperty(window, "shell", {
    value: { openReplaysDir },
    writable: false,
});

describe("shellApi", () => {
    beforeEach(() => {
        alert.mockReset();
        openReplaysDir.mockReset();
    });

    it("stays quiet when the call succeeds", async () => {
        openReplaysDir.mockResolvedValue({ status: "success", data: undefined } satisfies IpcResult);

        await shellApi.openReplaysDir();

        expect(alert).not.toHaveBeenCalled();
    });

    it("surfaces the details from a failed result", async () => {
        openReplaysDir.mockResolvedValue({ status: "failed", reason: "open_failed", details: "no application found" } satisfies IpcResult);

        await shellApi.openReplaysDir();

        expect(alert).toHaveBeenCalledWith(expect.objectContaining({ text: "lobby.api.shell.openFailed:no application found", severity: "error" }));
    });

    // Callers don't await this, so a rejection escaping here would hit Error.vue's fatal modal.
    it("absorbs a rejection instead of letting it escape", async () => {
        openReplaysDir.mockRejectedValue(new Error("No handler registered for 'shell:openReplaysDir'"));

        await expect(shellApi.openReplaysDir()).resolves.toBeUndefined();

        expect(alert).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("No handler registered") }));
    });
});

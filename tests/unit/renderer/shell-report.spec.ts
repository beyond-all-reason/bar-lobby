// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const alert = vi.hoisted(() => vi.fn());

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert } }));
vi.mock("@renderer/i18n", () => ({ setupI18n: () => ({ global: { t: (key: string, params: Record<string, string>) => `${key}:${params.details}` } }) }));

const { openAndReport } = await import("@renderer/api/shell");

describe("openAndReport", () => {
    beforeEach(() => {
        alert.mockReset();
    });

    it("stays quiet when the call succeeds", async () => {
        await openAndReport(async () => ({ status: "success", data: undefined }));

        expect(alert).not.toHaveBeenCalled();
    });

    it("surfaces the details from a failed result", async () => {
        await openAndReport(async () => ({ status: "failed", reason: "open_failed", details: "no application found" }));

        expect(alert).toHaveBeenCalledWith(expect.objectContaining({ text: "lobby.api.shell.openFailed:no application found", severity: "error" }));
    });

    // Callers don't await this, so a rejection escaping here would hit Error.vue's fatal modal.
    it("absorbs a rejection instead of letting it escape", async () => {
        await expect(openAndReport(() => Promise.reject(new Error("No handler registered for 'shell:openReplaysDir'")))).resolves.toBeUndefined();

        expect(alert).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("No handler registered") }));
    });
});

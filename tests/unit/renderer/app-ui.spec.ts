// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));

const { router } = await import("@renderer/router");
const { notificationsApi } = await import("@renderer/api/notifications");
const { appUi } = await import("@renderer/ui");

describe("appUi", () => {
    beforeEach(() => {
        vi.mocked(router.push).mockClear();
        vi.mocked(notificationsApi.alert).mockClear();
    });

    it("opens the matchmaking view when a match is waiting", () => {
        appUi.matchWaiting();

        expect(router.push).toHaveBeenCalledWith("/play/matchmaking");
    });

    it("confirms joined queues with an info alert", () => {
        appUi.queuesJoined();

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text: "Successfully joined matchmaking queue(s)", severity: "info" });
    });

    it("alerts when a queue list nobody asked for fails to load", () => {
        appUi.queueListFailed();

        expect(notificationsApi.alert).toHaveBeenCalledWith({ text: "Tachyon error: matchmaking/list", severity: "error" });
    });
});

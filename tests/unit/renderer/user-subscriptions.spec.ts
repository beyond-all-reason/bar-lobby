// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/api/tachyon", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@renderer/api/tachyon")>()),
    tachyonRequest: vi.fn(),
}));

Object.assign(window.tachyon, {
    isConnected: vi.fn(async () => false),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
});
Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { tachyonRequest } = await import("@renderer/api/tachyon");
const { provideUi } = await import("@renderer/logic/ui");
const { initConnectionLogic } = await import("@renderer/logic/connection");
const { connectionActions } = await import("@renderer/store/connection.store");
const { subsManager } = await import("@renderer/store/users.store");

const ui = {
    matchWaiting: vi.fn(),
    queuesJoined: vi.fn(),
    queueListFailed: vi.fn(),
    userSubscribeFailed: vi.fn(),
    userUnsubscribeFailed: vi.fn(),
};
const list = Symbol("test");

describe("user update subscriptions", () => {
    beforeAll(async () => {
        provideUi(ui);
        await initConnectionLogic();
    });

    beforeEach(() => {
        connectionActions.set({ isConnected: false });
        subsManager.clearAllFromList(list);
        vi.clearAllMocks();
        connectionActions.set({ isConnected: true });
    });

    it("subscribes to newly watched users", () => {
        vi.mocked(tachyonRequest).mockResolvedValue({} as never);

        subsManager.attach(["1"], list);

        expect(tachyonRequest).toHaveBeenCalledWith("user/subscribeUpdates", { userIds: ["1"] });
    });

    it("sends nothing while disconnected", () => {
        connectionActions.set({ isConnected: false });

        subsManager.attach(["1"], list);
        subsManager.detach(["1"], list);

        expect(tachyonRequest).not.toHaveBeenCalled();
    });

    it("reports a failed subscribe", async () => {
        vi.mocked(tachyonRequest).mockRejectedValue(new Error("refused"));

        subsManager.attach(["1"], list);
        await vi.waitFor(() => expect(ui.userSubscribeFailed).toHaveBeenCalledOnce());
    });

    it("reports a failed unsubscribe", async () => {
        vi.mocked(tachyonRequest)
            .mockResolvedValueOnce({} as never)
            .mockRejectedValue(new Error("refused"));
        subsManager.attach(["1"], list);

        subsManager.detach(["1"], list);
        await vi.waitFor(() => expect(ui.userUnsubscribeFailed).toHaveBeenCalledOnce());
    });
});

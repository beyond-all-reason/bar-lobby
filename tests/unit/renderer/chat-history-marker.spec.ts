// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { notificationsApi } from "@renderer/api/notifications";
import { MessagingReceivedEventData, MessagingSubscribeReceivedRequestData } from "tachyon-protocol/types";

vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: vi.fn() } }));
vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));

const receivedHandlers: Array<(data: MessagingReceivedEventData) => void> = [];

Object.assign(window.tachyon, {
    request: vi.fn(async () => ({ data: { hasMissedMessages: false } })),
    onEvent: (command: string, callback: (data: MessagingReceivedEventData) => void) => {
        if (command === "messaging/received") receivedHandlers.push(callback);
    },
});
Object.defineProperty(window, "auth", { value: { onChanged: vi.fn() }, writable: true });

const { chatStore, chat, initChatStore } = await import("@renderer/store/chat.store");
const { me } = await import("@renderer/store/me.store");

const receive = (data: Partial<MessagingReceivedEventData>) =>
    receivedHandlers.forEach((handler) =>
        handler({
            message: "hi",
            source: { type: "player", userId: "42" },
            timestamp: 1_700_000_000_000_000,
            marker: "-576460745805023",
            ...data,
        } as MessagingReceivedEventData)
    );

const subscribedSince = () => {
    const [, data] = vi.mocked(window.tachyon.request).mock.calls.at(-1) ?? [];

    return (data as MessagingSubscribeReceivedRequestData | undefined)?.since;
};

const subscribeCount = () => vi.mocked(window.tachyon.request).mock.calls.filter(([command]) => command === "messaging/subscribeReceived").length;

describe("chat history marker", () => {
    beforeAll(async () => {
        await initChatStore();
    });

    beforeEach(() => {
        chatStore.lastMarker = null;
        chatStore.lobbyChat.length = 0;
        chatStore.partyChat.length = 0;
        chatStore.userChats.clear();
        vi.mocked(notificationsApi.alert).mockClear();
        vi.mocked(window.tachyon.request).mockReset();
        vi.mocked(window.tachyon.request).mockResolvedValue({ data: { hasMissedMessages: false } } as never);
    });

    it("keeps the marker off the last message received", async () => {
        receive({ marker: "-576460745805023" });
        receive({ marker: "-576460745800000" });

        expect(chatStore.lastMarker).toBe("-576460745800000");
    });

    // The server buffers every source together, so a marker from a lobby message is
    // just as valid a resume point for direct messages.
    it("takes the marker whichever source it came from", async () => {
        receive({ source: { type: "lobby", lobbyId: "lobby-1", userId: "42" }, marker: "-576460745700000" });

        expect(chatStore.lastMarker).toBe("-576460745700000");
    });

    // Our own messages never come back from the server, so they carry no marker and
    // must not become the point we ask to resume from.
    it("ignores the messages this client sent itself", async () => {
        receive({ marker: "-576460745805023" });
        me.userId = "1";

        await chat.requestSend({ target: { type: "player", userId: "42" }, message: "mine" });

        expect(chatStore.lastMarker).toBe("-576460745805023");
    });

    it("resumes from the marker once it has one", async () => {
        receive({ marker: "-576460745805023" });

        await chat.requestSubscribeReceived();

        expect(subscribedSince()).toEqual({ type: "marker", value: "-576460745805023" });
    });

    it("asks for everything the server still holds when it has no marker and no history", async () => {
        await chat.requestSubscribeReceived();

        expect(subscribedSince()).toEqual({ type: "from_start" });
    });

    it("asks only for new messages when it has history it cannot place", async () => {
        chatStore.userChats.set("42", [{ message: "mine" } as never]);

        await chat.requestSubscribeReceived();

        expect(subscribedSince()).toEqual({ type: "latest" });
    });

    // system/disconnect stops the session GenServer, and it is restart: :temporary,
    // so the buffer the marker points into is gone for good.
    it("drops the marker when the user goes offline", async () => {
        receive({ marker: "-576460745805023" });

        chat.clearOnlineState();

        expect(chatStore.lastMarker).toBeNull();
    });

    it("does not resume from a marker the server has thrown away", async () => {
        receive({ marker: "-576460745805023" });
        chat.clearOnlineState();

        await chat.requestSubscribeReceived();

        expect(subscribedSince()).not.toEqual({ type: "marker", value: "-576460745805023" });
    });

    it("lets an explicit request win over the tracked marker", async () => {
        receive({ marker: "-576460745805023" });

        await chat.requestSubscribeReceived({ since: { type: "latest" } });

        expect(subscribedSince()).toEqual({ type: "latest" });
    });

    // The server splits its buffer at the marker and sends what follows it, so the
    // round trip has to resume from the last message we actually processed.
    describe("recovering messages missed while disconnected", () => {
        it("resumes from the last message it processed and takes the replay", async () => {
            receive({ source: { type: "player", userId: "42" }, marker: "-576460745805023" });

            // A dropped socket clears nothing, so the marker is still there to resume from.
            await chat.requestSubscribeReceived();

            expect(subscribedSince()).toEqual({ type: "marker", value: "-576460745805023" });

            receive({ source: { type: "player", userId: "42" }, message: "missed one", marker: "-576460745800000" });
            receive({ source: { type: "lobby", lobbyId: "lobby-1", userId: "7" }, message: "missed two", marker: "-576460745790000" });

            expect(chatStore.userChats.get("42")?.map((m) => m.message)).toEqual(["hi", "missed one"]);
            expect(chatStore.lobbyChat.map((m) => m.message)).toEqual(["missed two"]);
            expect(chatStore.lastMarker).toBe("-576460745790000");
        });

        // Resuming twice from the same point would re-deliver the replay, so the
        // marker has to advance as the replayed events are processed.
        it("leaves the marker at the end of the replay, not the start", async () => {
            receive({ marker: "-576460745805023" });
            await chat.requestSubscribeReceived();
            receive({ marker: "-576460745790000" });

            await chat.requestSubscribeReceived();

            expect(subscribedSince()).toEqual({ type: "marker", value: "-576460745790000" });
        });
    });

    // A failed subscribe leaves us connected and receiving nothing, and until the
    // socket happens to drop there is nothing else to try again.
    describe("when the subscription request fails", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("tries again", async () => {
            vi.mocked(window.tachyon.request).mockRejectedValueOnce(new Error("nope"));

            await chat.requestSubscribeReceived();
            await vi.advanceTimersByTimeAsync(5000);

            expect(subscribeCount()).toBe(2);
        });

        it("gives up rather than retrying forever", async () => {
            vi.mocked(window.tachyon.request).mockRejectedValue(new Error("nope"));

            await chat.requestSubscribeReceived();
            await vi.advanceTimersByTimeAsync(60_000);

            expect(subscribeCount()).toBe(5);
            expect(notificationsApi.alert).toHaveBeenCalled();
        });

        it("stops retrying once the user goes offline", async () => {
            vi.mocked(window.tachyon.request).mockRejectedValueOnce(new Error("nope"));

            await chat.requestSubscribeReceived();
            chat.clearOnlineState();
            await vi.advanceTimersByTimeAsync(60_000);

            expect(subscribeCount()).toBe(1);
        });

        // Exhausting the retries must not poison the next connection.
        it("starts counting again on the next connect", async () => {
            vi.mocked(window.tachyon.request).mockRejectedValue(new Error("nope"));
            await chat.requestSubscribeReceived();
            await vi.advanceTimersByTimeAsync(60_000);
            vi.mocked(window.tachyon.request).mockClear();

            await chat.requestSubscribeReceived();
            await vi.advanceTimersByTimeAsync(5000);

            expect(subscribeCount()).toBe(2);
        });
    });
});

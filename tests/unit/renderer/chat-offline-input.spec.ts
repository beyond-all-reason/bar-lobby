// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";

const requestSend = vi.hoisted(() => vi.fn());

vi.mock("@renderer/store/chat.store", () => ({
    chat: { requestSend, clearUserChat: vi.fn() },
    chatStore: { partyChat: [], userChats: new Map() },
}));

vi.mock("@renderer/store/tachyon.store", () => ({ tachyonStore: { isConnected: false } }));
vi.mock("@renderer/router", () => ({ router: { currentRoute: { value: { path: "/" } }, push: vi.fn(), replace: vi.fn() } }));

vi.mock("@renderer/composables/useDexieLiveQuery", () => ({
    useDexieLiveQueryWithDeps: () => ({ value: new Map() }),
}));

vi.mock("@renderer/store/db", () => ({ db: { users: { each: vi.fn(), filter: () => ({ each: vi.fn() }) } } }));

const { tachyonStore } = await import("@renderer/store/tachyon.store");
const PartyChat = (await import("@renderer/components/party/PartyChat.vue")).default;

const mountChat = () =>
    mount(PartyChat, {
        global: {
            plugins: [PrimeVue],
            directives: { "in-view": {} },
            stubs: { Markdown: true },
        },
    });

// Sending while the socket is down used to fail the round trip and raise a
// generic error, rather than the client declining to offer it.
describe("chat input while disconnected", () => {
    beforeEach(() => {
        requestSend.mockClear();
    });

    it("disables the input", () => {
        tachyonStore.isConnected = false;

        const wrapper = mountChat();

        expect(wrapper.find("input").attributes("disabled")).toBeDefined();
    });

    // Button's disabled prop only adds a class, so the click still lands and the
    // handler is the only thing standing between it and a doomed request.
    it("ignores the send button while the socket is down", async () => {
        tachyonStore.isConnected = false;

        await mountChat().find("button").trigger("click");

        expect(requestSend).not.toHaveBeenCalled();
    });

    it("sends once connected", async () => {
        tachyonStore.isConnected = true;

        const wrapper = mountChat();
        await wrapper.find("input").setValue("hello");
        await wrapper.find("button").trigger("click");

        expect(requestSend).toHaveBeenCalledWith({ target: { type: "party" }, message: "hello" });
    });
});

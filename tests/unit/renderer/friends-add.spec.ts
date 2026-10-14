// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { TachyonIpcError, TachyonRequestError } from "@renderer/api/tachyon";
import Friends from "@renderer/components/navbar/Friends.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const stubs = vi.hoisted(() => ({
    sendRequest: vi.fn(),
    alert: vi.fn(),
}));

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));
vi.mock("@renderer/components/navbar/Friend.vue", () => ({ default: { name: "Friend", template: "<div />" } }));
vi.mock("@renderer/i18n", () => ({ useTypedI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: stubs.alert } }));
vi.mock("@renderer/store/me.store", () => ({
    me: { userId: 1, friendUserIds: new Set(), outgoingFriendRequestUserIds: new Set(), incomingFriendRequestUserIds: new Set() },
    friends: { sendRequest: stubs.sendRequest },
}));

const SlotStub = { template: "<div><slot /></div>" };
const NumberStub = { name: "Number", template: "<input />" };

function render() {
    return mount(Friends, {
        props: { modelValue: true },
        global: {
            provide: { toggleMessages: ref(vi.fn()), toggleFriends: ref(vi.fn()), toggleDownloads: ref(vi.fn()) },
            stubs: {
                PopOutPanel: SlotStub,
                TabView: SlotStub,
                TabPanel: SlotStub,
                Accordion: true,
                AccordionTab: true,
                Friend: true,
                Number: NumberStub,
            },
        },
    });
}

async function addFriend(wrapper: ReturnType<typeof render>, userId: number) {
    const input = wrapper.findComponent({ name: "Number" });
    input.vm.$emit("update:modelValue", userId);
    input.vm.$emit("input", { value: userId });
    await flushPromises();

    const addButton = wrapper.findAll("button").find((button) => button.text() === "lobby.navbar.friends.addFriend")!;
    await addButton.trigger("click");
    await flushPromises();
}

type SendRequestReason = TachyonRequestError<"friend/sendRequest">["reason"];

const failed = (reason: SendRequestReason) => ({ type: "response", commandId: "friend/sendRequest", messageId: "1", status: "failed", reason }) as const;

describe("Friends add friend", () => {
    beforeEach(() => {
        stubs.sendRequest.mockReset();
        stubs.alert.mockReset();
    });

    it("sends the request for the entered user id", async () => {
        stubs.sendRequest.mockResolvedValue(undefined);

        await addFriend(render(), 42);

        expect(stubs.sendRequest).toHaveBeenCalledWith("42");
        expect(stubs.alert).not.toHaveBeenCalled();
    });

    it.each<[SendRequestReason, string]>([
        ["already_in_friendlist", "lobby.navbar.friends.notifications.errors.alreadyFriends"],
        ["invalid_user", "lobby.navbar.friends.notifications.errors.invalidUser"],
        ["outgoing_capacity_reached", "lobby.navbar.friends.notifications.errors.outgoingCapacityReached"],
    ])("shows the message for a %s rejection", async (reason, text) => {
        stubs.sendRequest.mockRejectedValue(new TachyonRequestError("friend/sendRequest", failed(reason)));

        await addFriend(render(), 42);

        expect(stubs.alert).toHaveBeenCalledWith({ text, severity: "error" });
    });

    it("shows the generic message when the request never reaches the server", async () => {
        stubs.sendRequest.mockRejectedValue(new TachyonIpcError("friend/sendRequest", new Error("Not connected to server")));

        await addFriend(render(), 42);

        expect(stubs.alert).toHaveBeenCalledWith({ text: "lobby.navbar.friends.notifications.errors.generic", severity: "error" });
    });
});

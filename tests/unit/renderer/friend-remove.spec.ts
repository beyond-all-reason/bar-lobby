// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { TachyonRequestError } from "@renderer/api/tachyon";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const stubs = vi.hoisted(() => ({ remove: vi.fn(), alert: vi.fn() }));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@renderer/i18n", () => ({ useTypedI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@renderer/api/notifications", () => ({ notificationsApi: { alert: stubs.alert } }));
vi.mock("@renderer/logic/me", () => ({ friendsLogic: { remove: stubs.remove } }));
vi.mock("@renderer/store/db", () => ({ db: { users: { get: vi.fn() } } }));
vi.mock("@renderer/store/chat.store", () => ({ chat: { addNewUserChat: vi.fn() } }));
vi.mock("@renderer/composables/useDexieLiveQuery", () => ({ useDexieLiveQuery: () => ref(undefined) }));
vi.mock("@renderer/composables/useReportUser", () => ({ useReportUser: () => ({ openReportUser: vi.fn() }) }));
vi.mock("@renderer/composables/usePartyInviteState", () => ({
    usePartyInviteState: () => ({ maxMembersReached: ref(false), userInParty: ref(false), userInvited: ref(false), inviteToParty: vi.fn() }),
}));

const Friend = (await import("@renderer/components/navbar/Friend.vue")).default;

describe("Friend remove", () => {
    it("shows the remove failure alert when the server refuses", async () => {
        stubs.remove.mockRejectedValue(new TachyonRequestError("friend/remove", { type: "response", commandId: "friend/remove", messageId: "1", status: "failed", reason: "internal_error" }));
        const wrapper = mount(Friend, {
            props: { userId: "x", type: "friend" },
            global: {
                provide: { toggleMessages: ref(vi.fn()) },
                stubs: { Button: { template: "<button @click=\"$emit('click')\"><slot /></button>" }, Flag: true, ReportUserIcon: true, Icon: true },
                directives: { tooltip: {} },
            },
        });

        await wrapper.findAll("button").at(-1)!.trigger("click");
        await flushPromises();

        expect(stubs.remove).toHaveBeenCalledWith("x");
        expect(stubs.alert).toHaveBeenCalledWith({ severity: "error", text: "Failed to remove friend." });
    });
});

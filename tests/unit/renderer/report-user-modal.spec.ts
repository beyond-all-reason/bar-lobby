// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";

import ReportUserModal from "@renderer/components/user/ReportUserModal.vue";
import Select from "@renderer/components/controls/Select.vue";
import { useReportUser } from "@renderer/composables/useReportUser";
import type { User } from "@main/model/user";

const requestReportUsers = vi.hoisted(() => vi.fn());
const alert = vi.hoisted(() => vi.fn());

vi.mock("@renderer/store/users.store", () => ({
    users: { requestReportUsers },
}));

vi.mock("@renderer/api/notifications", () => ({
    notificationsApi: { alert },
}));

vi.mock("@renderer/audio/audio", () => ({
    audioApi: { play: vi.fn() },
}));

vi.mock("vue-router", () => ({
    useRouter: () => ({ currentRoute: { value: { path: "/" } }, push: vi.fn() }),
}));

const reportedUser = {
    userId: "1234",
    username: "Naughty",
    displayName: "Naughty",
    clanId: null,
    partyId: null,
    countryCode: "??",
    status: "menu",
    battleRoomState: {},
} satisfies User;

function mountModal() {
    return mount(ReportUserModal, {
        global: {
            plugins: [PrimeVue],
            stubs: { teleport: true },
        },
    });
}

describe("ReportUserModal", () => {
    const { openReportUser, isOpen } = useReportUser();

    beforeEach(() => {
        requestReportUsers.mockReset();
        requestReportUsers.mockResolvedValue(true);
        alert.mockReset();
        isOpen.value = false;
    });

    it("sends the selected reason and message for the reported user", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        expect(wrapper.text()).toContain("Report Naughty");

        wrapper.findComponent(Select).vm.$emit("update:modelValue", "actions/cheating");
        await wrapper.find("textarea").setValue("  Was flying over my base with full map vision  ");
        await wrapper.find(".p-button").trigger("click");
        await flushPromises();

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "actions/cheating" },
            message: "Was flying over my base with full map vision",
        });
        expect(isOpen.value).toBe(false);
    });

    it("offers the same reasons and message limit as the website report form", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        const groups = wrapper.findComponent(Select).props("options") as Array<{ label: string; reasons: Array<{ value: string }> }>;

        expect(groups.map((group) => group.label)).toEqual(["Chat / Communication", "In game actions"]);
        expect(groups.flatMap((group) => group.reasons.map((reason) => reason.value))).toEqual([
            "chat/spam",
            "chat/bullying",
            "chat/hate",
            "chat/other",
            "actions/noob",
            "actions/griefing",
            "actions/cheating",
            "actions/other",
        ]);
        expect(wrapper.find("textarea").attributes("maxlength")).toBe("255");
    });

    it("does not send a report without a reason and a message", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await wrapper.find(".p-button").trigger("click");
        await flushPromises();

        expect(requestReportUsers).not.toHaveBeenCalled();
        expect(isOpen.value).toBe(true);
    });

    it("stays open when the request fails", async () => {
        requestReportUsers.mockResolvedValue(false);

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        wrapper.findComponent(Select).vm.$emit("update:modelValue", "actions/griefing");
        await wrapper.find("textarea").setValue("Kept shooting our own factory");
        await wrapper.find(".p-button").trigger("click");
        await flushPromises();

        expect(alert).not.toHaveBeenCalled();
        expect(isOpen.value).toBe(true);
    });
});

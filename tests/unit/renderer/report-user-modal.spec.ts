// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import PrimeVue from "primevue/config";

import ReportUserModal from "@renderer/components/user/ReportUserModal.vue";
import { useReportUser } from "@renderer/composables/useReportUser";
import type { User } from "@main/model/user";
import type { OnlineReplayDetails, OnlineReplayOverview } from "@main/content/replays/online-replays";

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

const searchOnlineByPlayer = vi.fn();
const getOnline = vi.fn();

Object.defineProperty(window, "replays", {
    value: { searchOnlineByPlayer, getOnline },
    writable: true,
});

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

const match = {
    id: "abcdef",
    startTime: "2026-07-27T22:06:02.000Z",
    durationMs: 1351267,
    mapName: "All That Glitters v2.2.3",
    allyTeamSizes: [8, 8],
    hasBots: false,
} satisfies OnlineReplayOverview;

const matchDetails = {
    ...match,
    preset: "team",
    serverMatchId: "10453109",
    players: [
        { name: "Naughty", userId: 1234, allyTeamId: 0, winningTeam: true },
        { name: "SomeoneElse", userId: 5678, allyTeamId: 1, winningTeam: false },
    ],
    spectators: [],
} satisfies OnlineReplayDetails;

function mountModal() {
    return mount(ReportUserModal, {
        global: {
            plugins: [PrimeVue],
            stubs: { teleport: true },
        },
    });
}

function cardLabels(wrapper: VueWrapper) {
    return wrapper.findAll(".card").map((card) => card.text());
}

async function clickCard(wrapper: VueWrapper, label: string) {
    const card = wrapper.findAll(".card").find((candidate) => candidate.text() === label);
    if (!card) throw new Error(`No card labelled "${label}"`);
    await card.trigger("click");
    await flushPromises();
}

describe("ReportUserModal", () => {
    const { openReportUser, isOpen } = useReportUser();

    beforeEach(() => {
        requestReportUsers.mockReset();
        requestReportUsers.mockResolvedValue(true);
        alert.mockReset();
        searchOnlineByPlayer.mockReset();
        searchOnlineByPlayer.mockResolvedValue([match]);
        getOnline.mockReset();
        getOnline.mockResolvedValue(matchDetails);
        isOpen.value = false;
    });

    it("offers the same reasons as the website report form", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        expect(wrapper.text()).toContain("Report Naughty");
        expect(cardLabels(wrapper)).toEqual(["Chat / Communication", "In game actions"]);

        await clickCard(wrapper, "Chat / Communication");
        expect(cardLabels(wrapper)).toEqual(["Spam", "Bullying", "Hate speech", "Other"]);

        await wrapper.find(".square button").trigger("click");
        await clickCard(wrapper, "In game actions");
        expect(cardLabels(wrapper)).toEqual(["Noob", "Griefing", "Cheating", "Other"]);
    });

    it("sends the reason, the message and the chosen match", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, "In game actions");
        await clickCard(wrapper, "Cheating");

        expect(searchOnlineByPlayer).toHaveBeenCalledWith("Naughty", 10);
        expect(wrapper.text()).toContain("8 vs 8 on All That Glitters v2.2.3");

        await wrapper.find(".match").trigger("click");
        await flushPromises();

        expect(getOnline).toHaveBeenCalledWith("abcdef");
        expect(wrapper.text()).toContain("SomeoneElse");
        // The replay line is appended to the message, so it has to come out of the 255 character budget.
        expect(wrapper.find("textarea").attributes("maxlength")).toBe("212");

        await wrapper.find("textarea").setValue("  Full map vision from minute 3  ");
        await wrapper.find(".green button").trigger("click");
        await flushPromises();

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "actions/cheating" },
            message: "Full map vision from minute 3\nReplay: https://bar-rts.com/replays/abcdef",
        });
        expect(isOpen.value).toBe(false);
    });

    it("sends a report without a match when none is picked", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, "Chat / Communication");
        await clickCard(wrapper, "Spam");
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        expect(getOnline).not.toHaveBeenCalled();

        await wrapper.find("textarea").setValue("Kept repeating the same line in lobby chat");
        await wrapper.find(".green button").trigger("click");
        await flushPromises();

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "chat/spam" },
            message: "Kept repeating the same line in lobby chat",
        });
    });

    it("does not send a report without a message", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, "Chat / Communication");
        await clickCard(wrapper, "Bullying");
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        expect(wrapper.find("textarea").attributes("maxlength")).toBe("255");

        await wrapper.find(".green button").trigger("click");
        await flushPromises();

        expect(requestReportUsers).not.toHaveBeenCalled();
        expect(isOpen.value).toBe(true);
    });

    it("stays open when the request fails", async () => {
        requestReportUsers.mockResolvedValue(false);

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, "In game actions");
        await clickCard(wrapper, "Griefing");
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Kept shooting our own factory");
        await wrapper.find(".green button").trigger("click");
        await flushPromises();

        expect(alert).not.toHaveBeenCalled();
        expect(isOpen.value).toBe(true);
    });
});

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
import type { IpcResult } from "@main/typed-ipc";

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
            directives: { tooltip: {} },
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
        searchOnlineByPlayer.mockResolvedValue({ status: "success", data: [match] });
        getOnline.mockReset();
        getOnline.mockResolvedValue({ status: "success", data: matchDetails });
        isOpen.value = false;
    });

    it("offers the same reasons as the website report form, all on one step", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        expect(wrapper.text()).toContain("Report Naughty");
        expect(wrapper.findAll(".section-header").map((header) => header.text())).toEqual(["Chat / Communication", "In-Game Actions"]);
        expect(cardLabels(wrapper)).toEqual(["Spam", "Bullying", "Hate speech", "Other", "Noob", "Griefing", "Cheating", "Other"]);
    });

    it("sends the reason, the message and the chosen match", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, "Cheating");

        expect(searchOnlineByPlayer).toHaveBeenCalledWith("Naughty", 10);
        expect(wrapper.find(".match").text()).toContain("8 vs 8");
        expect(wrapper.find(".match").text()).toContain("All That Glitters v2.2.3");

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

        await clickCard(wrapper, "Bullying");
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        expect(wrapper.find("textarea").attributes("maxlength")).toBe("255");

        await wrapper.find(".green button").trigger("click");
        await flushPromises();

        expect(requestReportUsers).not.toHaveBeenCalled();
        expect(isOpen.value).toBe(true);
    });

    it("drops a match search that lands after the modal was reopened on someone else", async () => {
        let resolveFirstSearch: (result: IpcResult<OnlineReplayOverview[]>) => void;
        searchOnlineByPlayer.mockImplementationOnce(() => new Promise((resolve) => (resolveFirstSearch = resolve)));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, "Spam");

        isOpen.value = false;
        await flushPromises();

        openReportUser({ ...reportedUser, userId: "5678", username: "SomeoneElse" });
        await flushPromises();
        await clickCard(wrapper, "Spam");

        resolveFirstSearch!({ status: "success", data: [{ ...match, id: "stale", mapName: "Stale Map" }] });
        await flushPromises();

        expect(wrapper.text()).not.toContain("Stale Map");
        expect(wrapper.find(".match").text()).toContain("All That Glitters v2.2.3");
    });

    it("drops replay details that land after another match was picked", async () => {
        let resolveFirstDetails: (result: IpcResult<OnlineReplayDetails>) => void;
        getOnline.mockImplementationOnce(() => new Promise((resolve) => (resolveFirstDetails = resolve)));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, "Cheating");

        await wrapper.find(".match").trigger("click");
        await flushPromises();

        await wrapper.find(".square button").trigger("click");
        await wrapper.find(".match").trigger("click");
        await flushPromises();

        resolveFirstDetails!({
            status: "success",
            data: { ...matchDetails, players: [{ name: "StalePlayer", userId: 1, allyTeamId: 0, winningTeam: false }] },
        });
        await flushPromises();

        expect(wrapper.text()).not.toContain("StalePlayer");
        expect(wrapper.text()).toContain("SomeoneElse");
    });

    it("renders a match with an unusable start time instead of throwing", async () => {
        searchOnlineByPlayer.mockResolvedValue({ status: "success", data: [{ ...match, startTime: "" }] });

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, "Spam");

        expect(wrapper.find(".match").text()).toContain("Unknown");
    });

    // What a stale main process does: the channel has no handler, so the invoke itself rejects and
    // no handler-side error handling ever runs.
    it("clears the spinner and says so when the match search cannot be reached", async () => {
        searchOnlineByPlayer.mockRejectedValue(new Error("No handler registered for 'replays:searchOnlineByPlayer'"));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, "Spam");

        expect(wrapper.find(".match-list-message").text()).toContain("Could not load recent matches");
        expect(wrapper.find(".fullwidth button").exists()).toBe(true);
    });

    it("keeps the details step usable when the replay lookup cannot be reached", async () => {
        getOnline.mockRejectedValue(new Error("No handler registered for 'replays:getOnline'"));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, "Cheating");

        await wrapper.find(".match").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Full map vision from minute 3");
        await wrapper.find(".green button").trigger("click");
        await flushPromises();

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "actions/cheating" },
            message: "Full map vision from minute 3\nReplay: https://bar-rts.com/replays/abcdef",
        });
    });

    it("separates a failed search from a player with no recent matches", async () => {
        searchOnlineByPlayer.mockResolvedValue({ status: "failed", reason: "replay_search_failed", details: "500" });

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, "Spam");

        expect(wrapper.find(".match-list-message").text()).toContain("Could not load recent matches");
        expect(wrapper.text()).not.toContain("No recent matches found");
    });

    it("offers the no match fallback while the search is still running", async () => {
        searchOnlineByPlayer.mockImplementationOnce(() => new Promise(() => undefined));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, "Spam");

        expect(wrapper.find(".fullwidth button").exists()).toBe(true);
    });

    it("trims the description when a match is attached after it was written", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, "Spam");
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("x".repeat(255));
        await wrapper.find(".square button").trigger("click");
        await wrapper.find(".match").trigger("click");
        await flushPromises();

        await wrapper.find(".green button").trigger("click");
        await flushPromises();

        const sent = requestReportUsers.mock.calls[0][0] as { message: string };
        expect(sent.message.length).toBe(255);
        expect(sent.message.endsWith("\nReplay: https://bar-rts.com/replays/abcdef")).toBe(true);
    });

    it("stays open when the request fails", async () => {
        requestReportUsers.mockResolvedValue(false);

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

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

// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import PrimeVue from "primevue/config";

import ReportUserModal from "@renderer/components/user/ReportUserModal.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import { useReportUser } from "@renderer/composables/useReportUser";
import type { User } from "@main/model/user";
import type { Message } from "@renderer/model/message";
import type { OnlineReplayDetails, OnlineReplayOverview } from "@main/replays/online-replays";
import type { IpcResult } from "@main/typed-ipc";

const requestReportUsers = vi.hoisted(() => vi.fn());
const alert = vi.hoisted(() => vi.fn());

// Mocked rather than imported: the real store reaches the router through the stores it pulls in,
// and the chat step only needs the three maps.
const chatStore = vi.hoisted(() => ({
    lobbyChats: new Map<string, Message[]>(),
    partyChats: new Map<string, Message[]>(),
    userChats: new Map<string, Message[]>(),
}));

vi.mock("@renderer/store/chat.store", () => ({ chatStore }));

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
vi.mock("@renderer/store/config.store", () => {
    return {
        configStore: {
            replayServiceUrl: "https://bar-rts.com/replays",
        },
    };
});

const searchOnlineByPlayer = vi.fn();
const getOnline = vi.fn();
const selectImages = vi.fn();

Object.defineProperty(window, "replays", {
    value: { searchOnlineByPlayer, getOnline },
    writable: true,
});

Object.defineProperty(window, "paths", {
    value: { selectImages },
    writable: true,
});

// jsdom lays nothing out, so it has no scrollIntoView to call.
const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

const CHAT = "Chat / Communication";
const ACTIONS = "In-Game Actions";

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

const otherUser = { ...reportedUser, userId: "5678", username: "Someone", displayName: "Someone" } satisfies User;

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

function lobbyMessage(userId: string, text: string, timestamp: number) {
    return {
        message: text,
        source: { type: "lobby", lobbyId: "lobby-1", userId },
        timestamp,
        marker: "",
        seen: false,
    } as unknown as Message;
}

function directMessage(userId: string, text: string, timestamp: number) {
    return {
        message: text,
        source: { type: "player", userId },
        timestamp,
        marker: "",
        seen: false,
    } as unknown as Message;
}

const mounted: VueWrapper[] = [];

// The modal submits through its form, and jsdom skips form submission for a form that is not in
// the document, so this has to mount attached the way the real teleport does.
function mountModal() {
    const wrapper = mount(ReportUserModal, {
        attachTo: document.body,
        global: {
            plugins: [PrimeVue],
            stubs: { teleport: true },
            directives: { tooltip: {} },
        },
    });
    mounted.push(wrapper);

    return wrapper;
}

function cardLabels(wrapper: VueWrapper) {
    return wrapper.findAll(".card-title").map((card) => card.text());
}

async function clickCard(wrapper: VueWrapper, label: string) {
    const card = wrapper.findAll(".card").find((candidate) => candidate.find(".card-title").text() === label);
    if (!card) throw new Error(`No card labelled "${label}"`);
    await card.trigger("click");
    await flushPromises();
}

async function action(wrapper: VueWrapper) {
    await wrapper.find(".step-action button").trigger("click");
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
        selectImages.mockReset();
        scrollIntoView.mockReset();
        selectImages.mockResolvedValue([]);
        chatStore.lobbyChats.clear();
        chatStore.partyChats.clear();
        chatStore.userChats.clear();
        isOpen.value = false;
    });

    afterEach(() => {
        mounted.splice(0).forEach((wrapper) => wrapper.unmount());
    });

    it("offers a reason per kind of report, with no sub types", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        expect(wrapper.text()).toContain("Report Naughty");
        expect(cardLabels(wrapper)).toEqual([CHAT, ACTIONS]);
    });

    it("titles every step and only offers a way back once there is one", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        expect(wrapper.find(".step-title").text()).toBe("Reason for Report");
        expect(wrapper.find(".back").exists()).toBe(false);

        await clickCard(wrapper, ACTIONS);
        expect(wrapper.find(".step-title").text()).toBe("Which Match?");
        expect(wrapper.find(".back").exists()).toBe(true);

        await wrapper.find(".match").trigger("click");
        await flushPromises();

        expect(wrapper.find(".step-title").text()).toBe("Extra Info");

        await wrapper.find(".back button").trigger("click");
        expect(wrapper.find(".step-title").text()).toBe("Which Match?");
    });

    it("sends the reason, the message and the chosen match", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);

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
        await action(wrapper);

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "actions" },
            message: "Full map vision from minute 3\nReplay: https://bar-rts.com/replays/abcdef",
        });
    });

    it("shows that the report landed instead of closing itself", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Kept shooting our own factory");
        await action(wrapper);

        expect(wrapper.find(".step-title").text()).toBe("Report Submitted");
        expect(isOpen.value).toBe(true);
        expect(wrapper.find(".back").exists()).toBe(false);
    });

    it("sends a report without a match when none is picked", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        expect(getOnline).not.toHaveBeenCalled();

        await wrapper.find("textarea").setValue("Kept repeating the same line in lobby chat");
        await action(wrapper);

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "actions" },
            message: "Kept repeating the same line in lobby chat",
        });
    });

    it("does not send a report without a message", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        expect(wrapper.find("textarea").attributes("maxlength")).toBe("255");

        await action(wrapper);

        expect(requestReportUsers).not.toHaveBeenCalled();
        expect(isOpen.value).toBe(true);
    });

    it("takes a chat report past the messages before it will send", async () => {
        chatStore.lobbyChats.set("lobby-1", [lobbyMessage("1234", "you are throwing", 1_700_000_000_000_000), lobbyMessage("5678", "leave them alone", 1_700_000_060_000_000)]);

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, CHAT);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Abusive in lobby chat");
        await action(wrapper);

        expect(requestReportUsers).not.toHaveBeenCalled();
        expect(wrapper.find(".step-title").text()).toBe("Which messages?");

        await action(wrapper);

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "chat" },
            message: "Abusive in lobby chat",
        });
    });

    it("only offers messages from the reported user", async () => {
        chatStore.lobbyChats.set("lobby-1", [lobbyMessage("1234", "you are throwing", 1_700_000_000_000_000), lobbyMessage("5678", "leave them alone", 1_700_000_060_000_000)]);
        chatStore.userChats.set("1234", [directMessage("1234", "and stay out", 1_700_000_120_000_000)]);

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, CHAT);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();
        await wrapper.find("textarea").setValue("Abusive everywhere");
        await action(wrapper);

        const lines = wrapper.findAll(".chat-line").map((line) => line.text());
        expect(lines.some((line) => line.includes("you are throwing"))).toBe(true);
        expect(lines.some((line) => line.includes("and stay out"))).toBe(true);
        expect(lines.some((line) => line.includes("leave them alone"))).toBe(false);
        expect(wrapper.findAll(".conversation-label").map((label) => label.text())).toContain("Direct messages");
    });

    it("starts with the message the report was opened from already picked", async () => {
        const reported = lobbyMessage("1234", "you are throwing", 1_700_000_000_000_000);
        chatStore.lobbyChats.set("lobby-1", [reported, lobbyMessage("1234", "and again", 1_700_000_060_000_000)]);

        const wrapper = mountModal();
        openReportUser(reportedUser, reported);
        await flushPromises();

        await clickCard(wrapper, CHAT);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();
        await wrapper.find("textarea").setValue("Abusive in lobby chat");
        await action(wrapper);

        const picked = wrapper.findAll(".chat-line").filter((line) => line.findComponent(Checkbox).props("modelValue"));
        expect(picked).toHaveLength(1);
        expect(picked[0].text()).toContain("you are throwing");
    });

    async function reachChatStep(wrapper: VueWrapper) {
        await clickCard(wrapper, CHAT);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();
        await wrapper.find("textarea").setValue("Abusive in chat");
        await action(wrapper);
    }

    function visibleLines(wrapper: VueWrapper) {
        return wrapper
            .findAll(".chat-line")
            .filter((line) => line.isVisible())
            .map((line) => line.text());
    }

    it("narrows to the conversation a message was reported from and scrolls to it", async () => {
        const reported = lobbyMessage("1234", "you are throwing", 1_700_000_000_000_000);
        chatStore.lobbyChats.set("lobby-1", [reported]);
        chatStore.userChats.set("1234", [directMessage("1234", "and stay out", 1_700_000_120_000_000)]);

        const wrapper = mountModal();
        openReportUser(reportedUser, reported);
        await flushPromises();
        await reachChatStep(wrapper);

        expect(visibleLines(wrapper).some((line) => line.includes("you are throwing"))).toBe(true);
        expect(visibleLines(wrapper).some((line) => line.includes("and stay out"))).toBe(false);
        expect(scrollIntoView).toHaveBeenCalledOnce();
        expect((scrollIntoView.mock.contexts[0] as HTMLElement).textContent).toContain("you are throwing");
    });

    it("opens a collapsed conversation when its header is clicked", async () => {
        const reported = lobbyMessage("1234", "you are throwing", 1_700_000_000_000_000);
        chatStore.lobbyChats.set("lobby-1", [reported]);
        chatStore.userChats.set("1234", [directMessage("1234", "and stay out", 1_700_000_120_000_000)]);

        const wrapper = mountModal();
        openReportUser(reportedUser, reported);
        await flushPromises();
        await reachChatStep(wrapper);

        const direct = wrapper.findAll(".conversation-label").find((label) => label.text().includes("Direct messages"))!;
        await direct.trigger("click");

        expect(visibleLines(wrapper).some((line) => line.includes("and stay out"))).toBe(true);
    });

    it("shows every conversation when the report did not come from a message", async () => {
        chatStore.lobbyChats.set("lobby-1", [lobbyMessage("1234", "you are throwing", 1_700_000_000_000_000)]);
        chatStore.userChats.set("1234", [directMessage("1234", "and stay out", 1_700_000_120_000_000)]);

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await reachChatStep(wrapper);

        expect(visibleLines(wrapper)).toHaveLength(2);
        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it("says so when nothing this session can be cited", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, CHAT);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();
        await wrapper.find("textarea").setValue("Abusive in lobby chat");
        await action(wrapper);

        expect(wrapper.find(".chat-list-message").text()).toContain("not holding any chat");
        expect(wrapper.findAll(".chat-line")).toHaveLength(0);
    });

    it("drops a match search that lands after the modal was reopened on someone else", async () => {
        let resolveFirstSearch: (result: IpcResult<OnlineReplayOverview[]>) => void;
        searchOnlineByPlayer.mockImplementationOnce(() => new Promise((resolve) => (resolveFirstSearch = resolve)));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, ACTIONS);

        isOpen.value = false;
        await flushPromises();

        openReportUser({ ...reportedUser, userId: "5678", username: "SomeoneElse" });
        await flushPromises();
        await clickCard(wrapper, ACTIONS);

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
        await clickCard(wrapper, ACTIONS);

        await wrapper.find(".match").trigger("click");
        await flushPromises();

        await wrapper.find(".back button").trigger("click");
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
        await clickCard(wrapper, ACTIONS);

        expect(wrapper.find(".match").text()).toContain("Unknown");
    });

    // What a stale main process does: the channel has no handler, so the invoke itself rejects and
    // no handler-side error handling ever runs.
    it("clears the spinner and says so when the match search cannot be reached", async () => {
        searchOnlineByPlayer.mockRejectedValue(new Error("No handler registered for 'replays:searchOnlineByPlayer'"));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, ACTIONS);

        expect(wrapper.find(".match-list-message").text()).toContain("Could not load recent matches");
        expect(wrapper.find(".fullwidth button").exists()).toBe(true);
    });

    it("keeps the details step usable when the replay lookup cannot be reached", async () => {
        getOnline.mockRejectedValue(new Error("No handler registered for 'replays:getOnline'"));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, ACTIONS);

        await wrapper.find(".match").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Full map vision from minute 3");
        await action(wrapper);

        expect(requestReportUsers).toHaveBeenCalledWith({
            userIds: ["1234"],
            reason: { type: "actions" },
            message: "Full map vision from minute 3\nReplay: https://bar-rts.com/replays/abcdef",
        });
    });

    it("separates a failed search from a player with no recent matches", async () => {
        searchOnlineByPlayer.mockResolvedValue({ status: "failed", reason: "replay_search_failed", details: "500" });

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, ACTIONS);

        expect(wrapper.find(".match-list-message").text()).toContain("Could not load recent matches");
        expect(wrapper.text()).not.toContain("No recent matches found");
    });

    it("offers the no match fallback while the search is still running", async () => {
        searchOnlineByPlayer.mockImplementationOnce(() => new Promise(() => undefined));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();
        await clickCard(wrapper, ACTIONS);

        expect(wrapper.find(".fullwidth button").exists()).toBe(true);
    });

    it("trims the description when a match is attached after it was written", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("x".repeat(255));
        await wrapper.find(".back button").trigger("click");
        await wrapper.find(".match").trigger("click");
        await flushPromises();

        await action(wrapper);

        const sent = requestReportUsers.mock.calls[0][0] as { message: string };
        expect(sent.message.length).toBe(255);
        expect(sent.message.endsWith("\nReplay: https://bar-rts.com/replays/abcdef")).toBe(true);
    });

    it("stays open when the request fails", async () => {
        requestReportUsers.mockResolvedValue(false);

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Kept shooting our own factory");
        await action(wrapper);

        expect(alert).not.toHaveBeenCalled();
        expect(wrapper.find(".step-title").text()).toBe("Extra Info");
        expect(isOpen.value).toBe(true);
    });

    // Enter reaches the form the modal wraps everything in, so a step the user is only passing
    // through must not be able to send the report.
    it("does not send the report on enter while stepping back through the wizard", async () => {
        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".match").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("They were map hacking the whole game");
        await wrapper.find(".back button").trigger("click");
        await wrapper.find(".back button").trigger("keydown", { key: "Enter" });
        await flushPromises();

        expect(requestReportUsers).not.toHaveBeenCalled();
        expect(isOpen.value).toBe(true);
    });

    it("lets a report that was abandoned mid-flight land without disturbing the next one", async () => {
        let finishFirstSubmit: (sent: boolean) => void = () => undefined;
        requestReportUsers.mockImplementationOnce(() => new Promise((resolve) => (finishFirstSubmit = resolve)));

        const wrapper = mountModal();
        openReportUser(reportedUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Spammed the lobby");
        await action(wrapper);

        isOpen.value = false;
        await flushPromises();

        openReportUser(otherUser);
        await flushPromises();

        await clickCard(wrapper, ACTIONS);
        await wrapper.find(".fullwidth button").trigger("click");
        await flushPromises();

        await wrapper.find("textarea").setValue("Half written report about someone else");
        finishFirstSubmit(true);
        await flushPromises();

        expect(isOpen.value).toBe(true);
        expect(wrapper.find("textarea").element.value).toBe("Half written report about someone else");
    });
});

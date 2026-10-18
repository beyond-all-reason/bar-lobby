// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { defineComponent, h, Suspense } from "vue";
import type { PartyState } from "tachyon-protocol/types";

vi.mock("@renderer/store/me.store", () => ({ me: { userId: "me" } }));
vi.mock("@renderer/logic/party", () => ({ partyLogic: { markSeen: vi.fn() } }));
vi.mock("@renderer/store/chat.store", () => ({ chatStore: { partyChats: new Map() } }));
vi.mock("@renderer/store/matchmaking.store", () => ({
    matchmakingStore: { playlists: [], downloadsRequired: {}, selectedQueue: "" },
    matchmaking: {},
    MatchmakingStatus: { Idle: "Idle" },
    getPlaylistName: () => "",
}));
vi.mock("@renderer/composables/usePartySizeMatchmaking", () => ({ usePartySizeMatchmaking: () => ({ partyTooLarge: false }), getPartySize: () => 0 }));
vi.mock("@renderer/composables/useDexieLiveQuery", () => ({ useDexieLiveQueryWithDeps: () => ({ value: new Map() }) }));
vi.mock("@renderer/store/db", () => ({ db: { users: { each: vi.fn(), get: vi.fn() } } }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { partyUpdates } = await import("@renderer/store/party.store");
const PartyView = (await import("@renderer/views/profile/party.vue")).default;

function makeParty(id: string, members: string[], invited: string[] = []): PartyState {
    return {
        id,
        members: members.map((userId) => ({ userId, joinedAt: 0 })),
        invited: invited.map((userId) => ({ userId, invitedAt: 0 })),
        maxMembers: 4,
    };
}

// The view awaits in its setup, so it needs a Suspense around it to render.
async function mountView() {
    const wrapper = mount(defineComponent({ render: () => h(Suspense, null, { default: () => h(PartyView) }) }), {
        global: {
            plugins: [PrimeVue],
            directives: { "in-view": {}, tooltip: {} },
            stubs: { ChatPanel: true, PartyMember: true, PartyInvitee: true, QueueDownloadsModal: true, DownloadContentButton: true, Icon: true },
        },
    });
    await flushPromises();

    return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountView>>;

const PARTY_TAB = 0;
const INVITES_TAB = 1;

const activeTab = (wrapper: Wrapper) => wrapper.findAll(".p-tabview-header").findIndex((header) => header.classes("p-highlight"));

const clickTab = (wrapper: Wrapper, index: number) => wrapper.findAll(".p-tabview-nav-link")[index].trigger("click");

describe("party view tabs", () => {
    beforeEach(() => {
        partyUpdates.clear();
    });

    it("stays on invites once the only invite is cancelled", async () => {
        partyUpdates.set(makeParty("invite", ["host"], ["me"]), "me");
        const wrapper = await mountView();
        expect(activeTab(wrapper)).toBe(INVITES_TAB);

        partyUpdates.remove("invite", "me");
        await flushPromises();

        expect(activeTab(wrapper)).toBe(INVITES_TAB);
    });

    it("opens the party on accepting an invite", async () => {
        partyUpdates.set(makeParty("invite", ["host"], ["me"]), "me");
        const wrapper = await mountView();

        partyUpdates.set(makeParty("invite", ["host", "me"]), "me");
        await flushPromises();

        expect(activeTab(wrapper)).toBe(PARTY_TAB);
    });

    // Already being in a party means there's a party to show both before and after the accept.
    it("opens the new party on accepting an invite while in another", async () => {
        partyUpdates.set(makeParty("own", ["me"]), "me");
        partyUpdates.set(makeParty("invite", ["host"], ["me"]), "me");
        const wrapper = await mountView();
        await clickTab(wrapper, INVITES_TAB);

        partyUpdates.set(makeParty("invite", ["host", "me"]), "me");
        partyUpdates.remove("own", "me");
        await flushPromises();

        expect(activeTab(wrapper)).toBe(PARTY_TAB);
    });

    it("stays on invites while in a party as invites come and go", async () => {
        partyUpdates.set(makeParty("own", ["me"]), "me");
        partyUpdates.set(makeParty("invite", ["host"], ["me"]), "me");
        const wrapper = await mountView();
        await clickTab(wrapper, INVITES_TAB);

        partyUpdates.remove("invite", "me");
        partyUpdates.set(makeParty("another", ["host"], ["me"]), "me");
        await flushPromises();

        expect(activeTab(wrapper)).toBe(INVITES_TAB);
    });
});

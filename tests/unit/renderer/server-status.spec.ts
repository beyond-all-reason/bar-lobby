// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import ServerStatus from "@renderer/components/navbar/ServerStatus.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => ({
    tachyonStore: {} as {
        isConnected: boolean;
        wantsConnection: boolean;
        error?: string;
        reconnectInterval?: NodeJS.Timeout;
        serverStats?: { userCount: number };
    },
    me: { isAuthenticated: true },
    goOnline: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    openLogInConfirmation: vi.fn(),
}));

vi.mock("@renderer/i18n", () => ({ useTypedI18n: () => ({ t: (key: string) => key }) }));
vi.mock("vue-router", () => ({ useRouter: () => ({ currentRoute: { value: { path: "/play" } } }) }));
vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));
vi.mock("@renderer/composables/useLogInConfirmation", () => ({
    useLogInConfirmation: () => ({ openLogInConfirmation: stubs.openLogInConfirmation }),
}));
vi.mock("@renderer/store/tachyon.store", () => ({
    tachyonStore: stubs.tachyonStore,
    tachyon: { goOffline: stubs.disconnect },
}));
vi.mock("@renderer/store/me.store", () => ({
    me: stubs.me,
    auth: { goOnline: stubs.goOnline },
}));

const RETRYING = 1 as unknown as NodeJS.Timeout;

// Modal teleports to #wrapper, which does not exist here, and the confirmation
// body is the thing under test.
const ModalStub = {
    name: "Modal",
    props: ["modelValue", "title"],
    template: `<div class="modal"><div class="modal-title">{{ title }}</div><slot /></div>`,
};

function render(state: Partial<typeof stubs.tachyonStore> & { authenticated?: boolean } = {}) {
    const { authenticated = true, ...store } = state;
    Object.assign(stubs.tachyonStore, {
        isConnected: false,
        wantsConnection: false,
        error: undefined,
        reconnectInterval: undefined,
        serverStats: undefined,
        ...store,
    });
    stubs.me.isAuthenticated = authenticated;

    return mount(ServerStatus, {
        global: {
            stubs: { Modal: ModalStub },
            directives: { "click-away": {} },
        },
    });
}

const label = (wrapper: ReturnType<typeof render>) => wrapper.find("button").text();
// Button puts state classes on its Control wrapper, so that is the element worth
// asserting against. The clickable button is nested inside it.
const menuEntries = (wrapper: ReturnType<typeof render>) => wrapper.findAll(".status-menu .control");

async function openMenu(wrapper: ReturnType<typeof render>) {
    await wrapper.find("button").trigger("click");

    return menuEntries(wrapper);
}

const choose = (entry: ReturnType<typeof menuEntries>[number]) => entry.find("button").trigger("click");

beforeEach(() => {
    stubs.goOnline.mockClear();
    stubs.disconnect.mockClear();
    stubs.openLogInConfirmation.mockClear();
});

describe("ServerStatus label", () => {
    it("reports offline when signed out", () => {
        expect(label(render({ authenticated: false }))).toContain("lobby.navbar.serverStatus.offline");
    });

    it("reports the player count while connected", () => {
        const wrapper = render({ isConnected: true, wantsConnection: true, serverStats: { userCount: 42 } });

        expect(label(wrapper)).toContain("42");
        expect(label(wrapper)).toContain("lobby.navbar.serverStatus.playersOnline");
    });

    // Every failed attempt sets an error, so reading the error first reported a
    // fault for the whole of a retry loop that was working as intended.
    it("reports reconnecting while retries are running, even with an error set", () => {
        const wrapper = render({ wantsConnection: true, reconnectInterval: RETRYING, error: "Error" });

        expect(label(wrapper)).toContain("lobby.navbar.serverStatus.reconnecting");
    });

    it("reports offline when signed in with no socket and nothing being retried", () => {
        expect(label(render())).toContain("lobby.navbar.serverStatus.offline");
    });
});

describe("ServerStatus menu", () => {
    it("prompts for sign in instead of opening when signed out", async () => {
        const wrapper = render({ authenticated: false });

        await wrapper.find("button").trigger("click");

        expect(stubs.openLogInConfirmation).toHaveBeenCalled();
        expect(menuEntries(wrapper)).toHaveLength(0);
    });

    it("marks Online as current while connected", async () => {
        const entries = await openMenu(render({ isConnected: true, wantsConnection: true }));

        expect(entries[0].classes()).toContain("current");
        expect(entries[2].classes()).not.toContain("current");
    });

    // The user did not ask for the drop, so a retry in progress is still Online.
    // Deriving this from the socket put them on Offline while the button above
    // the menu said Reconnecting.
    it("keeps Online as current while retrying", async () => {
        const entries = await openMenu(render({ wantsConnection: true, reconnectInterval: RETRYING }));

        expect(entries[0].classes()).toContain("current");
        expect(entries[2].classes()).not.toContain("current");
    });

    it("marks Offline as current once the user has gone offline", async () => {
        const entries = await openMenu(render({ wantsConnection: false }));

        expect(entries[2].classes()).toContain("current");
        expect(entries[0].classes()).not.toContain("current");
    });

    // Button turns disabled into a class on its Control wrapper rather than an
    // attribute on the inner button, and that class is what stops the clicks.
    it("leaves Busy permanently unavailable", async () => {
        const entries = await openMenu(render({ isConnected: true, wantsConnection: true }));

        expect(entries[1].classes()).toContain("disabled");
    });
});

describe("ServerStatus actions", () => {
    it("connects without confirmation when picking Online", async () => {
        const entries = await openMenu(render());

        await choose(entries[0]);

        expect(stubs.goOnline).toHaveBeenCalledOnce();
    });

    it("does nothing when picking Online while already connected", async () => {
        const entries = await openMenu(render({ isConnected: true, wantsConnection: true }));

        await choose(entries[0]);

        expect(stubs.goOnline).not.toHaveBeenCalled();
    });

    // Leaving is disruptive, so it confirms rather than acting on the click.
    it("confirms before disconnecting", async () => {
        const wrapper = render({ isConnected: true, wantsConnection: true });
        const entries = await openMenu(wrapper);

        await choose(entries[2]);

        expect(wrapper.find(".modal-title").text()).toBe("lobby.navbar.serverStatus.disconnectTitle");
        expect(stubs.disconnect).not.toHaveBeenCalled();
    });

    it("disconnects once the confirmation is accepted", async () => {
        const wrapper = render({ isConnected: true, wantsConnection: true });
        const entries = await openMenu(wrapper);
        await choose(entries[2]);

        await wrapper.findAll(".modal button").at(1)!.trigger("click");

        expect(stubs.disconnect).toHaveBeenCalledOnce();
    });

    it("offers to stop retrying rather than to disconnect while reconnecting", async () => {
        const wrapper = render({ wantsConnection: true, reconnectInterval: RETRYING });
        const entries = await openMenu(wrapper);

        await choose(entries[2]);

        expect(wrapper.find(".modal-title").text()).toBe("lobby.navbar.serverStatus.stopReconnectingTitle");
    });

    // The connection can change while the modal sits there, and the user has to
    // get the action they were shown rather than one chosen when they confirm.
    it("runs the action it offered, not the one the current state implies", async () => {
        const wrapper = render({ isConnected: true, wantsConnection: true });
        const entries = await openMenu(wrapper);
        await choose(entries[2]);

        stubs.tachyonStore.isConnected = false;
        stubs.tachyonStore.wantsConnection = false;
        await wrapper.vm.$nextTick();
        await wrapper.findAll(".modal button").at(1)!.trigger("click");

        expect(stubs.disconnect).toHaveBeenCalledOnce();
        expect(stubs.goOnline).not.toHaveBeenCalled();
    });
});

// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import ReconnectingOverlay from "@renderer/components/misc/ReconnectingOverlay.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => ({
    store: {} as { isReconnecting: boolean },
    goOffline: vi.fn(async () => {}),
}));

vi.mock("@renderer/store/connection.store", () => ({ connectionStore: stubs.store }));
vi.mock("@renderer/logic/connection", () => ({ connectionLogic: { goOffline: stubs.goOffline } }));
vi.mock("@renderer/i18n", () => ({ useTypedI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

function mountWith(isReconnecting: boolean) {
    stubs.store.isReconnecting = isReconnecting;
    stubs.goOffline.mockClear();

    return mount(ReconnectingOverlay);
}

describe("ReconnectingOverlay", () => {
    it("stays out of the way while the connection is fine", () => {
        const wrapper = mountWith(false);

        expect(wrapper.find(".reconnecting-overlay").exists()).toBe(false);
    });

    // The alert raised when the socket drops times out long before the retries do,
    // so this is what is left telling the user why nothing responds.
    it("covers the screen for as long as the retries run", () => {
        const wrapper = mountWith(true);

        expect(wrapper.find(".reconnecting-overlay").exists()).toBe(true);
        expect(wrapper.text()).toContain("lobby.navbar.serverStatus.reconnecting");
    });

    // Without this the overlay is a trap: the user is blocked from acting and has
    // no way to stop waiting.
    it("offers a way out that ends the retries", async () => {
        const wrapper = mountWith(true);

        await wrapper.find("button").trigger("click");

        expect(stubs.goOffline).toHaveBeenCalledOnce();
    });
});

// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";

import Modal from "@renderer/components/common/Modal.vue";
import BattleLobbyDrawer from "@renderer/components/battle/BattleLobbyDrawer.vue";
import { isAnyModalOpen } from "@renderer/composables/useModalStack";
import { battleStore } from "@renderer/store/battle.store";

vi.mock("@renderer/audio/audio", () => ({
    audioApi: { play: vi.fn() },
}));
vi.mock("@renderer/store/battle.store", async () => {
    const { reactive } = await import("vue");
    return { battleStore: reactive({ isLobbyOpened: false }) };
});
vi.mock("@renderer/components/battle/OfflineBattleComponent.vue", () => ({ default: { name: "OfflineBattleComponent", template: "<div />" } }));

function pressEscape() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
}

describe("Modal Escape", () => {
    let wrapper: VueWrapper;
    let state: { outer: boolean; inner: boolean };

    beforeEach(async () => {
        const host = document.createElement("div");
        host.id = "wrapper";
        document.body.appendChild(host);

        // The second modal opens while the first is up, like Report from the battle results.
        const outer = ref(false);
        const inner = ref(false);
        state = {
            get outer() {
                return outer.value;
            },
            get inner() {
                return inner.value;
            },
        };
        wrapper = mount(
            defineComponent({
                setup: () => () =>
                    h("div", [
                        h(Modal, { title: "outer", modelValue: outer.value, "onUpdate:modelValue": (v: boolean) => (outer.value = v) }),
                        h(Modal, { title: "inner", modelValue: inner.value, "onUpdate:modelValue": (v: boolean) => (inner.value = v) }),
                    ]),
            }),
            { attachTo: host }
        );
        await nextTick();

        outer.value = true;
        await nextTick();
        inner.value = true;
        await nextTick();
    });

    afterEach(() => {
        wrapper.unmount();
        document.body.innerHTML = "";
    });

    it("closes only the modal on top", async () => {
        pressEscape();
        await nextTick();

        expect(state.inner).toBe(false);
        expect(state.outer).toBe(true);
    });

    it("closes the one underneath on the next press", async () => {
        pressEscape();
        await nextTick();
        pressEscape();
        await nextTick();

        expect(state.outer).toBe(false);
        expect(isAnyModalOpen.value).toBe(false);
    });

    it("leaves Escape to the rest of the app once nothing is open", async () => {
        pressEscape();
        await nextTick();
        pressEscape();
        await nextTick();

        const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});

describe("Battle lobby drawer Escape", () => {
    let wrapper: VueWrapper;
    const modalOpen = ref(false);

    beforeEach(async () => {
        const host = document.createElement("div");
        host.id = "wrapper";
        document.body.appendChild(host);

        wrapper = mount(
            defineComponent({
                setup: () => () => h("div", [h(BattleLobbyDrawer), h(Modal, { title: "map options", modelValue: modalOpen.value, "onUpdate:modelValue": (v: boolean) => (modalOpen.value = v) })]),
            }),
            { attachTo: host }
        );
        await nextTick();

        battleStore.isLobbyOpened = true;
        modalOpen.value = true;
        await nextTick();
    });

    afterEach(() => {
        wrapper.unmount();
        document.body.innerHTML = "";
        battleStore.isLobbyOpened = false;
        modalOpen.value = false;
    });

    it("stays open while a modal opened from it takes the keypress", async () => {
        pressEscape();
        await nextTick();

        expect(modalOpen.value).toBe(false);
        expect(battleStore.isLobbyOpened).toBe(true);
    });

    it("closes on the next press", async () => {
        pressEscape();
        await nextTick();
        pressEscape();
        await nextTick();

        expect(battleStore.isLobbyOpened).toBe(false);
    });
});

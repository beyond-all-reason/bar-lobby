// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import PrimeVue from "primevue/config";
import PrimeContextMenu from "primevue/contextmenu";

import ContextMenu from "@renderer/components/common/ContextMenu.vue";

const mounted: VueWrapper[] = [];

function mountMenu() {
    const wrapper = mount(ContextMenu, {
        props: { model: [{ label: "Item" }] },
        global: { plugins: [PrimeVue] },
        attachTo: document.body,
    });
    mounted.push(wrapper);
    return wrapper;
}

function isVisible(wrapper: VueWrapper) {
    return (wrapper.findComponent(PrimeContextMenu).vm as unknown as { visible: boolean }).visible;
}

function rightClick() {
    return new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
}

describe("ContextMenu", () => {
    afterEach(() => {
        mounted.splice(0).forEach((wrapper) => wrapper.unmount());
    });

    // Bot and lobby participant rows each own a menu, and right-clicking a second row must not leave the first one open.
    it("closes the open menu when another one opens", async () => {
        const first = mountMenu();
        const second = mountMenu();

        first.vm.show(rightClick());
        await nextTick();
        second.vm.show(rightClick());
        await nextTick();

        expect(isVisible(first)).toBe(false);
        expect(isVisible(second)).toBe(true);
    });

    it("reopens a menu that was closed by another one", async () => {
        const first = mountMenu();
        const second = mountMenu();

        first.vm.show(rightClick());
        second.vm.show(rightClick());
        first.vm.show(rightClick());
        await nextTick();

        expect(isVisible(first)).toBe(true);
        expect(isVisible(second)).toBe(false);
    });

    // Only menus opened through the wrapper know about each other, so one using PrimeVue's directly stays open.
    it("is the only place that uses PrimeVue's ContextMenu directly", () => {
        const sources = import.meta.glob<string>("../../../src/renderer/**/*.{vue,ts}", { query: "?raw", import: "default", eager: true });

        const direct = Object.entries(sources)
            .filter(([, source]) => source.includes('from "primevue/contextmenu"'))
            .map(([path]) => path.replace(/^(\.\.\/)+/, ""));

        expect(direct).toEqual(["src/renderer/components/common/ContextMenu.vue"]);
    });
});

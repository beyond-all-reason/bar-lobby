// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import MapListComponent from "@renderer/components/maps/MapListComponent.vue";

const { queueMapDownloads } = vi.hoisted(() => ({ queueMapDownloads: vi.fn() }));

vi.mock("@renderer/composables/useDexieLiveQuery", async () => {
    const { ref } = await import("vue");
    return {
        useDexieLiveQueryWithDeps: () =>
            ref([
                { springName: "map-b", isInstalled: false },
                { springName: "map-installed", isInstalled: true },
                { springName: "map-a", isInstalled: false },
                { springName: "map-queued", isInstalled: false },
            ]),
    };
});

vi.mock("@renderer/store/db", () => ({ db: {} }));
vi.mock("@renderer/store/maps.store", () => ({
    mapsStore: {
        availableMapNames: new Set<string>(),
        filters: {
            downloadedOnly: false,
            favoritesOnly: false,
            gameType: {},
            maxPlayers: 40,
            minPlayers: 2,
            terrain: {},
        },
    },
    queueMapDownloads,
}));
vi.mock("@renderer/store/downloads.store", () => ({
    downloadsStore: {
        mapDownloadQueue: [{ springName: "map-queued", status: "queued" }],
    },
}));
vi.mock("@vueuse/core", () => ({ useInfiniteScroll: vi.fn() }));

describe("MapListComponent", () => {
    beforeEach(() => {
        queueMapDownloads.mockReset();
    });

    it("submits selected eligible maps in their displayed catalog order", async () => {
        const wrapper = mount(MapListComponent, {
            global: {
                stubs: {
                    Button: {
                        emits: ["click"],
                        template: '<button :class="$attrs.class" @click="$emit(\'click\')"><slot /></button>',
                    },
                    Checkbox: {
                        props: ["modelValue"],
                        emits: ["update:modelValue"],
                        template: '<button class="map-checkbox" @click="$emit(\'update:modelValue\', !modelValue)"></button>',
                    },
                    MapOverviewCard: { template: "<div />" },
                    SearchBox: { template: "<div />" },
                    Select: { template: "<div />" },
                },
            },
        });

        const checkboxes = wrapper.findAll(".map-checkbox");
        expect(checkboxes).toHaveLength(2);

        await checkboxes[1].trigger("click");
        await checkboxes[0].trigger("click");
        await nextTick();
        await wrapper.find(".download-selected").trigger("click");

        expect(queueMapDownloads).toHaveBeenCalledWith(["map-b", "map-a"]);
    });

    it("selects every displayed eligible map before submitting the batch", async () => {
        const wrapper = mount(MapListComponent, {
            global: {
                stubs: {
                    Button: {
                        emits: ["click"],
                        template: '<button :class="$attrs.class" @click="$emit(\'click\')"><slot /></button>',
                    },
                    Checkbox: {
                        props: ["modelValue"],
                        emits: ["update:modelValue"],
                        template: '<button class="map-checkbox" @click="$emit(\'update:modelValue\', !modelValue)"></button>',
                    },
                    MapOverviewCard: { template: "<div />" },
                    SearchBox: { template: "<div />" },
                    Select: { template: "<div />" },
                },
            },
        });

        await wrapper.find(".select-all-maps").trigger("click");
        await wrapper.find(".download-selected").trigger("click");

        expect(queueMapDownloads).toHaveBeenCalledWith(["map-b", "map-a"]);
    });
});

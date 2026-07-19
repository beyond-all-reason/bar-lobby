// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

import Downloads from "@renderer/components/navbar/Downloads.vue";
import PopOutPanel from "@renderer/components/navbar/PopOutPanel.vue";
import { downloadsStore } from "@renderer/store/downloads.store";

vi.mock("@renderer/i18n", () => ({
    useTypedI18n: () => ({
        t: (key: string) =>
            ({
                "lobby.navbar.downloads.downloading": "Downloading",
                "lobby.navbar.downloads.queued": "Queued",
                "lobby.navbar.downloads.noDownloads": "No downloads active",
            })[key] ?? key,
    }),
}));

describe("Downloads", () => {
    beforeEach(() => {
        downloadsStore.mapDownloadQueue = [];
        downloadsStore.mapDownloads = [];
        downloadsStore.engineDownloads = [];
        downloadsStore.gameDownloads = [];
        downloadsStore.updateDownloads = [];
    });

    it("declares a transform transition so completed rows animate the remaining queue upward", () => {
        const source = readFileSync(resolve(process.cwd(), "src/renderer/components/navbar/Downloads.vue"), "utf8");

        expect(source).toContain(".downloads-list-move {\n    transition: transform 0.2s ease;");
    });

    it("keeps the navbar popover and renders the ordered map queue without progress details", () => {
        downloadsStore.mapDownloadQueue = [
            { springName: "map-a", status: "downloading" },
            { springName: "map-b", status: "queued" },
            { springName: "map-c", status: "queued" },
        ];

        const wrapper = mount(Downloads, {
            props: { modelValue: true },
            global: {
                provide: {
                    toggleDownloads: ref(),
                    toggleFriends: ref(),
                    toggleMessages: ref(),
                },
                stubs: {
                    Loader: { template: "<div />" },
                    Panel: { template: '<div class="popout-panel"><slot /></div>' },
                    Progress: { template: "<div />" },
                },
            },
        });

        expect(wrapper.findComponent(PopOutPanel).exists()).toBe(true);
        expect(wrapper.findAll(".downloads__download").map((row) => row.text())).toEqual(["map-aDownloading", "map-bQueued", "map-cQueued"]);
        expect(wrapper.text()).not.toContain("%");
    });
});

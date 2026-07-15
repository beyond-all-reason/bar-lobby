// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import DownloadsButton from "@renderer/components/navbar/DownloadsButton.vue";
import { downloadsStore } from "@renderer/store/downloads.store";

describe("DownloadsButton", () => {
    beforeEach(() => {
        downloadsStore.mapDownloadQueue = [];
        downloadsStore.mapDownloads = [];
        downloadsStore.engineDownloads = [];
        downloadsStore.gameDownloads = [];
        downloadsStore.updateDownloads = [];
    });

    it("shows a badge with the combined queued and downloading map count", async () => {
        const wrapper = mount(DownloadsButton, {
            global: {
                stubs: {
                    Button: { template: '<button :class="$attrs.class"><slot /></button>' },
                    Icon: { template: "<div />" },
                },
            },
        });

        expect(wrapper.find(".download-button__badge").exists()).toBe(false);

        downloadsStore.mapDownloadQueue = [
            { springName: "map-downloading", status: "downloading" },
            { springName: "map-queued-a", status: "queued" },
            { springName: "map-queued-b", status: "queued" },
        ];
        await nextTick();

        expect(wrapper.find(".download-button__badge").text()).toBe("3");
    });
});

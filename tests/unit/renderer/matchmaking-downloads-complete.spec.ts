// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";

const triggerAssetsRefresh = vi.fn();
const sendListRequest = vi.fn();
const alertRequestFailure = vi.fn();

vi.mock("@renderer/store/matchmaking.store", () => ({
    matchmakingStore: {
        playlists: [],
        downloadsRequired: { "1v1": { engines: [], games: [], maps: ["Quicksilver"] } },
        selectedQueue: "1v1",
        status: "Idle",
    },
    matchmaking: { triggerAssetsRefresh, sendListRequest },
    MatchmakingStatus: { Idle: "Idle" },
    getPlaylistName: () => "",
}));
vi.mock("@renderer/composables/usePartySizeMatchmaking", () => ({ usePartySizeMatchmaking: () => ({ partyTooLarge: false }), getPartySize: () => 0 }));
vi.mock("@renderer/utils/alert-request-failure", () => ({ alertRequestFailure }));

const MatchmakingView = (await import("@renderer/views/play/matchmaking.vue")).default;

function mountView() {
    return mount(MatchmakingView, {
        global: {
            plugins: [PrimeVue],
            directives: { tooltip: {} },
            stubs: { QueueDownloadsModal: true, DownloadContentButton: true, Icon: true },
        },
    });
}

describe("matchmaking view after downloads complete", () => {
    beforeEach(() => {
        triggerAssetsRefresh.mockReset();
        sendListRequest.mockReset();
        alertRequestFailure.mockReset();
    });

    // An escaped rejection here reaches Error.vue's unhandledrejection listener as a fatal modal.
    it("alerts instead of rejecting when the content check fails", async () => {
        const error = new Error("content:missing failed");
        triggerAssetsRefresh.mockRejectedValue(error);
        const wrapper = mountView();

        wrapper.findComponent({ name: "DownloadContentButton" }).vm.$emit("downloads-complete");
        await flushPromises();

        expect(alertRequestFailure).toHaveBeenCalledWith(error, "content:missing");
    });

    // A failed refresh leaves downloadsRequired listing content that is now installed.
    it("re-lists the queues to rebuild what downloads are required when the content check fails", async () => {
        triggerAssetsRefresh.mockRejectedValue(new Error("content:missing failed"));
        const wrapper = mountView();
        sendListRequest.mockClear();

        wrapper.findComponent({ name: "DownloadContentButton" }).vm.$emit("downloads-complete");
        await flushPromises();

        expect(sendListRequest).toHaveBeenCalledOnce();
    });

    it("refreshes without alerting when the content check succeeds", async () => {
        triggerAssetsRefresh.mockResolvedValue(undefined);
        const wrapper = mountView();

        wrapper.findComponent({ name: "DownloadContentButton" }).vm.$emit("downloads-complete");
        await flushPromises();

        expect(triggerAssetsRefresh).toHaveBeenCalledOnce();
        expect(alertRequestFailure).not.toHaveBeenCalled();
        expect(sendListRequest).not.toHaveBeenCalled();
    });
});

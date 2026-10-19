// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";

const refreshRequiredDownloads = vi.fn();
const listQueues = vi.fn();
const alertRequestFailure = vi.fn();

vi.mock("@renderer/store/matchmaking.store", () => ({
    matchmakingStore: {
        playlists: [],
        downloadsRequired: { "1v1": { engines: [], games: [], maps: ["Quicksilver"] } },
        selectedQueue: "1v1",
        status: "Idle",
    },
    MatchmakingStatus: { Idle: "Idle" },
    getPlaylistName: () => "",
}));
vi.mock("@renderer/logic/matchmaking", () => ({
    matchmakingLogic: { refreshRequiredDownloads, listQueues },
    MatchmakingJoinRefused: class {},
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
        refreshRequiredDownloads.mockReset();
        listQueues.mockReset();
        alertRequestFailure.mockReset();
    });

    // An escaped rejection here reaches Error.vue's unhandledrejection listener as a fatal modal.
    it("alerts instead of rejecting when the content check fails", async () => {
        const error = new Error("content:missing failed");
        refreshRequiredDownloads.mockRejectedValue(error);
        const wrapper = mountView();

        wrapper.findComponent({ name: "DownloadContentButton" }).vm.$emit("downloads-complete");
        await flushPromises();

        expect(alertRequestFailure).toHaveBeenCalledWith(error, "content:missing");
    });

    // A failed refresh leaves downloadsRequired listing content that is now installed.
    it("re-lists the queues to rebuild what downloads are required when the content check fails", async () => {
        refreshRequiredDownloads.mockRejectedValue(new Error("content:missing failed"));
        const wrapper = mountView();
        listQueues.mockClear();

        wrapper.findComponent({ name: "DownloadContentButton" }).vm.$emit("downloads-complete");
        await flushPromises();

        expect(listQueues).toHaveBeenCalledOnce();
    });

    it("refreshes without alerting when the content check succeeds", async () => {
        refreshRequiredDownloads.mockResolvedValue(undefined);
        const wrapper = mountView();

        wrapper.findComponent({ name: "DownloadContentButton" }).vm.$emit("downloads-complete");
        await flushPromises();

        expect(refreshRequiredDownloads).toHaveBeenCalledOnce();
        expect(alertRequestFailure).not.toHaveBeenCalled();
        expect(listQueues).not.toHaveBeenCalled();
    });
});

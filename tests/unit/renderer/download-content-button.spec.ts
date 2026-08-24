// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef } from "@main/content/content-ref";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import { contentsStore } from "@renderer/store/contents.store";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { missing, ensure } = vi.hoisted(() => ({ missing: vi.fn(), ensure: vi.fn() }));

vi.mock("@renderer/i18n", () => ({
    useTypedI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

vi.mock("@renderer/api/notifications", () => ({
    notificationsApi: { alert: vi.fn() },
}));

vi.stubGlobal("window", Object.assign(window, { content: { missing, ensure } }));

function mountButton(props: Record<string, unknown> = {}) {
    return mount(DownloadContentButton, {
        props: { maps: ["Quicksilver"], ...props },
        slots: { default: "Play" },
        global: {
            stubs: {
                Progress: true,
                // The real one pulls in the router, which this component has nothing to do with.
                Button: { template: "<button><slot /></button>" },
            },
        },
    });
}

describe("DownloadContentButton", () => {
    beforeEach(() => {
        missing.mockReset().mockResolvedValue([]);
        ensure.mockReset().mockResolvedValue(undefined);
        contentsStore.inFlight = [];
        contentsStore.revision = 0;
    });

    it("offers the download until the content is known to be present", async () => {
        const held: ContentRef[] = [{ type: "map", id: "Quicksilver" }];
        missing.mockResolvedValue(held);

        const wrapper = mountButton();

        expect(wrapper.find(".quick-play-button").exists()).toBe(false);

        missing.mockResolvedValue([]);
        contentsStore.revision++;
        await flushPromises();

        expect(wrapper.find(".quick-play-button").exists()).toBe(true);
    });

    // Several checks can be outstanding at once and nothing orders their answers, so the newest question
    // has to decide rather than whichever answer lands last.
    it("ignores a presence check that a newer one has already replaced", async () => {
        const deferred: Array<(refs: ContentRef[]) => void> = [];
        missing.mockImplementation(() => new Promise<ContentRef[]>((resolve) => deferred.push(resolve)));

        const wrapper = mountButton();
        await flushPromises();
        const stale = deferred.length - 1;

        contentsStore.revision++;
        await flushPromises();

        expect(deferred.length).toBeGreaterThan(stale + 1);

        // Newest answers first and says the content is there, then a stale one insists it is missing.
        deferred[deferred.length - 1]([]);
        await flushPromises();
        deferred[stale]([{ type: "map", id: "Quicksilver" }]);
        await flushPromises();

        expect(wrapper.find(".quick-play-button").exists()).toBe(true);
    });

    it("does not offer to play before the presence check has answered", () => {
        missing.mockReturnValue(new Promise(() => {}));

        const wrapper = mountButton();

        expect(wrapper.find(".quick-play-button").exists()).toBe(false);
    });

    it("asks for every requested ref when the download is clicked", async () => {
        missing.mockResolvedValue([{ type: "map", id: "Quicksilver" }]);

        const wrapper = mountButton({ maps: ["Quicksilver"], engines: ["2025.01.3"], games: ["byar:test"] });
        await flushPromises();

        await wrapper.get(".quick-download-button").trigger("click");
        await flushPromises();

        expect(ensure).toHaveBeenCalledWith([
            { type: "engine", id: "2025.01.3" },
            { type: "game", id: "byar:test" },
            { type: "map", id: "Quicksilver" },
        ]);
        expect(wrapper.emitted("downloads-started")).toHaveLength(1);
        expect(wrapper.emitted("downloads-complete")).toHaveLength(1);
    });

    it("reports downloads complete even when acquiring fails", async () => {
        missing.mockResolvedValue([{ type: "map", id: "Quicksilver" }]);
        ensure.mockRejectedValue(new Error("prd exited 1"));

        const wrapper = mountButton();
        await flushPromises();

        await wrapper.get(".quick-download-button").trigger("click");
        await flushPromises();

        expect(wrapper.emitted("downloads-complete")).toHaveLength(1);
    });

    it("shows the downloading state while the ref is in flight", async () => {
        missing.mockResolvedValue([{ type: "map", id: "Quicksilver" }]);

        const wrapper = mountButton();
        await flushPromises();

        contentsStore.inFlight = [{ type: "map", id: "Quicksilver", status: "acquiring", currentBytes: 1, totalBytes: 2, progress: 0.5, attempts: 1 }];
        await flushPromises();

        expect(wrapper.text()).toContain("downloading");
    });
});

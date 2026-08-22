// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { NewsFeedEntry } from "@main/services/news.service";
import enTranslation from "@renderer/assets/languages/en.json";
import DevlogEntry from "@renderer/components/misc/DevlogEntry.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openInBrowser = vi.hoisted(() => vi.fn());

vi.mock("@renderer/api/shell", () => ({ shellApi: { openInBrowser } }));

const link = "https://www.beyondallreason.info/microblogs/some-update";
const readMore = enTranslation.lobby.buttons.readMore;

function entry(overrides: Partial<NewsFeedEntry> = {}): NewsFeedEntry {
    return {
        id: "some-update",
        title: "Some update ⇀ Microblog ★ Beyond All Reason RTS",
        description: "author | The body of the entry.",
        published: new Date().toISOString(),
        link,
        ...overrides,
    };
}

// jsdom does not lay text out, so every element reports a height of 0 and the line clamp can
// never overflow on its own. Give the clamped preview the metrics it would have in a browser.
function previewOf(totalLines: number) {
    const lineHeight = 20;
    for (const [property, value] of [
        ["clientHeight", 3 * lineHeight],
        ["scrollHeight", totalLines * lineHeight],
    ] as const) {
        vi.spyOn(HTMLElement.prototype, property, "get").mockImplementation(function (this: HTMLElement) {
            return this.classList.contains("dev-desc") ? value : 0;
        });
    }
}

async function mountEntry(entryProp: NewsFeedEntry) {
    const wrapper = mount(DevlogEntry, { props: { entry: entryProp }, attachTo: document.body });
    // The overflow check runs on mount, so its result only reaches the DOM on the next tick.
    await flushPromises();
    return wrapper;
}

describe("DevlogEntry", () => {
    beforeEach(() => {
        openInBrowser.mockReset();
        previewOf(10);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // The entry was plain text, so there was no way to reach the post it previews.
    it("opens the entry in the browser when clicked", async () => {
        const wrapper = await mountEntry(entry());

        await wrapper.trigger("click");

        expect(openInBrowser).toHaveBeenCalledWith(link);
    });

    it("renders as a button so it is keyboard reachable", async () => {
        expect((await mountEntry(entry())).element.tagName).toBe("BUTTON");
    });

    it("keeps the whole body when the description contains pipes", async () => {
        const wrapper = await mountEntry(entry({ description: "author | Before | after." }));

        expect(wrapper.get(".dev-desc").text()).toBe("Before | after.");
    });

    it("shows a read more affordance once the preview is clamped", async () => {
        expect((await mountEntry(entry())).text()).toContain(readMore);
    });

    // A short entry is fully visible, so pointing at "read more" would lead nowhere new.
    it("hides the read more affordance when the whole entry fits", async () => {
        previewOf(2);

        expect((await mountEntry(entry())).text()).not.toContain(readMore);
    });

    // Feed entries are not guaranteed to carry a link.
    it("stays inert when the feed entry has no link", async () => {
        const wrapper = await mountEntry(entry({ link: undefined }));

        expect(wrapper.text()).not.toContain(readMore);

        await wrapper.trigger("click");

        expect(openInBrowser).not.toHaveBeenCalled();
    });
});

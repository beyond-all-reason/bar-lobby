// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { NewsFeedData } from "@main/services/news.service";
import DevlogEntry from "@renderer/components/misc/DevlogEntry.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openInBrowser = vi.hoisted(() => vi.fn());

vi.mock("@renderer/i18n", () => ({ useTypedI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@renderer/api/shell", () => ({ shellApi: { openInBrowser } }));

const link = "https://www.beyondallreason.info/microblogs/some-update";

function entry(overrides: Partial<NewsFeedData> = {}): NewsFeedData {
    return {
        title: "Some update ⇀ Microblog ★ Beyond All Reason RTS",
        description: "author | The body of the entry.",
        published: new Date().toISOString(),
        link,
        ...overrides,
    };
}

function mountEntry(entryProp: NewsFeedData | undefined) {
    return mount(DevlogEntry, { props: { entry: entryProp } });
}

describe("DevlogEntry", () => {
    beforeEach(() => {
        openInBrowser.mockReset();
    });

    // The entry was plain text, so there was no way to read the rest of a truncated post.
    it("opens the entry in the browser when clicked", async () => {
        const wrapper = mountEntry(entry());

        await wrapper.trigger("click");

        expect(openInBrowser).toHaveBeenCalledWith(link);
    });

    it("renders as a button so it is keyboard reachable", () => {
        expect(mountEntry(entry()).element.tagName).toBe("BUTTON");
    });

    it("shows a read more affordance when there is somewhere to go", () => {
        expect(mountEntry(entry()).text()).toContain("lobby.components.misc.devlogEntry.readMore");
    });

    // Feed entries are not guaranteed to carry a link, and a dead button is worse than plain text.
    it("stays inert when the feed entry has no link", async () => {
        const wrapper = mountEntry(entry({ link: undefined }));

        expect(wrapper.element.tagName).toBe("DIV");
        expect(wrapper.text()).not.toContain("lobby.components.misc.devlogEntry.readMore");

        await wrapper.trigger("click");

        expect(openInBrowser).not.toHaveBeenCalled();
    });

    it("survives an undefined entry", async () => {
        const wrapper = mountEntry(undefined);

        await wrapper.trigger("click");

        expect(openInBrowser).not.toHaveBeenCalled();
    });
});

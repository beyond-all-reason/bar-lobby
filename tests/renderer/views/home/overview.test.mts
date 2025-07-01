import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import overview from "@renderer/views/home/overview.vue";

vi.mock("@renderer/components/misc/NewsFeed.vue", () => ({ default: { template: "<div>NewsFeed</div>" } }));
vi.mock("@renderer/components/misc/DevlogFeed.vue", () => ({ default: { template: "<div>DevlogFeed</div>" } }));

describe("overview.vue", () => {
    it("renders a dashboard to access all lobby functionalities", () => {
        const wrapper = mount(overview);

        expect(wrapper.text()).toContain("A new lobby has landed");
        expect(wrapper.text()).toContain("Quick play");
    });
});

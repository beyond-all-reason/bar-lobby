// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import DiagonalChoiceLevel from "@renderer/components/battle/DiagonalChoiceLevel.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const choices = [
    {
        id: "alpha",
        title: "Alpha",
        eyebrow: "Recommended",
        description: "First choice",
        summary: "Two teams",
        actionLabel: "Configure",
        artwork: "/alpha.jpg",
    },
    {
        id: "beta",
        title: "Beta",
        description: "Second choice",
        artwork: "/beta.jpg",
    },
];

describe("DiagonalChoiceLevel", () => {
    it("renders each choice as a full-card button with decorative artwork", () => {
        const wrapper = mount(DiagonalChoiceLevel, { props: { choices } });
        const alpha = wrapper.get('[data-choice-id="alpha"]');

        expect(wrapper.findAll("[data-choice-id]")).toHaveLength(2);
        expect(alpha.element.tagName).toBe("BUTTON");
        expect(alpha.attributes("type")).toBe("button");
        expect(alpha.get(".art").attributes("aria-hidden")).toBe("true");
        expect(alpha.get(".art").attributes("style")).toContain('background-image: url("/alpha.jpg")');
        expect(alpha.attributes("style") ?? "").not.toContain("background-image");
    });

    it("renders the optional content hierarchy", () => {
        const wrapper = mount(DiagonalChoiceLevel, { props: { choices } });
        const alpha = wrapper.get('[data-choice-id="alpha"]');

        expect(alpha.get(".eyebrow").text()).toBe("Recommended");
        expect(alpha.get(".title").text()).toBe("Alpha");
        expect(alpha.get(".description").text()).toBe("First choice");
        expect(alpha.get(".summary").text()).toBe("Two teams");
        expect(alpha.get(".action").text()).toBe("Configure");
        expect(alpha.find(".quick-play-button").exists()).toBe(false);
    });

    it("exposes the number of choices for responsive sizing", () => {
        const wrapper = mount(DiagonalChoiceLevel, { props: { choices } });

        expect(wrapper.attributes("style")).toContain("--choice-count: 2");
    });

    it("emits the selected choice id", async () => {
        const wrapper = mount(DiagonalChoiceLevel, { props: { choices } });

        await wrapper.get('[data-choice-id="beta"]').trigger("click");

        expect(wrapper.emitted("selected")).toEqual([["beta"]]);
    });

    it("does not emit a disabled choice", async () => {
        const wrapper = mount(DiagonalChoiceLevel, {
            props: {
                choices: [{ ...choices[0], disabled: true }],
            },
        });
        const choice = wrapper.get('[data-choice-id="alpha"]');

        expect(choice.attributes("disabled")).toBeDefined();
        await choice.trigger("click");

        expect(wrapper.emitted("selected")).toBeUndefined();
    });
});

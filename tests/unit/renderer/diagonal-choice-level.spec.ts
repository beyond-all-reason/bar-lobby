// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import DiagonalChoiceLevel from "@renderer/components/battle/DiagonalChoiceLevel.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const choices = [
    {
        id: "alpha",
        label: "Alpha",
        description: "First choice",
        backgroundImage: "/alpha.jpg",
    },
    {
        id: "beta",
        label: "Beta",
        description: "Second choice",
        backgroundImage: "/beta.jpg",
    },
];

describe("DiagonalChoiceLevel", () => {
    it("renders each choice and its background image", () => {
        const wrapper = mount(DiagonalChoiceLevel, { props: { choices } });

        expect(wrapper.findAll("[data-choice-id]")).toHaveLength(2);
        expect(wrapper.get('[data-choice-id="alpha"]').text()).toContain("First choice");
        expect(wrapper.get('[data-choice-id="alpha"]').attributes("style")).toContain('background-image: url("/alpha.jpg")');
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

        await wrapper.get('[data-choice-id="alpha"]').trigger("click");

        expect(wrapper.emitted("selected")).toBeUndefined();
    });
});

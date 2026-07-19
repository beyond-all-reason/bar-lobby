// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import NestedChoicePanel from "@renderer/components/battle/NestedChoicePanel.vue";
import type { ChoicePanelItem } from "@renderer/components/battle/nested-choice-panel.types";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

function action(id: string, run = vi.fn().mockResolvedValue({ ok: true })): ChoicePanelItem {
    return { type: "action", id, title: id, artwork: `${id}.png`, run };
}

describe("NestedChoicePanel", () => {
    it("navigates arbitrary-depth branches and returns one level at a time", async () => {
        const beforeEnter = vi.fn();
        const choices: ChoicePanelItem[] = [
            action("root-action"),
            {
                type: "branch",
                id: "first-branch",
                title: "First branch",
                artwork: "first.png",
                beforeEnter,
                children: [
                    action("first-leaf"),
                    {
                        type: "branch",
                        id: "second-branch",
                        title: "Second branch",
                        artwork: "second.png",
                        children: [action("deep-leaf")],
                    },
                ],
            },
        ];
        const wrapper = mount(NestedChoicePanel, { props: { choices, backLabel: "Back" } });

        await wrapper.get('[data-choice-id="first-branch"]').trigger("click");
        expect(beforeEnter).toHaveBeenCalledTimes(1);
        expect(wrapper.findAll('[data-choice-id="root-action"]').length > 0).toBe(false);
        expect(wrapper.findAll('[data-choice-id="first-leaf"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-testid="choice-panel-back"]').length > 0).toBe(true);

        await wrapper.get('[data-choice-id="second-branch"]').trigger("click");
        expect(wrapper.findAll('[data-choice-id="deep-leaf"]').length > 0).toBe(true);

        await wrapper.get('[data-testid="choice-panel-back"]').trigger("click");
        expect(wrapper.findAll('[data-choice-id="first-leaf"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="deep-leaf"]').length > 0).toBe(false);

        await wrapper.get('[data-testid="choice-panel-back"]').trigger("click");
        expect(wrapper.findAll('[data-choice-id="root-action"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-testid="choice-panel-back"]').length > 0).toBe(false);
    });

    it("resets nested navigation to the root when resetKey changes", async () => {
        const choices: ChoicePanelItem[] = [{ type: "branch", id: "branch", title: "Branch", artwork: "branch.png", children: [action("leaf")] }];
        const wrapper = mount(NestedChoicePanel, { props: { choices, backLabel: "Back", resetKey: 0 } });

        await wrapper.get('[data-choice-id="branch"]').trigger("click");
        expect(wrapper.findAll('[data-choice-id="leaf"]').length > 0).toBe(true);

        await wrapper.setProps({ resetKey: 1 });

        expect(wrapper.findAll('[data-choice-id="branch"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="leaf"]').length > 0).toBe(false);
    });

    it("does not complete an action after the panel resets", async () => {
        let resolveAction!: (result: { ok: true }) => void;
        const run = vi.fn(() => new Promise<{ ok: true }>((resolve) => (resolveAction = resolve)));
        const wrapper = mount(NestedChoicePanel, {
            props: { choices: [action("launch", run)], backLabel: "Back", resetKey: 0 },
        });

        await wrapper.get('[data-choice-id="launch"]').trigger("click");
        await wrapper.setProps({ resetKey: 1 });
        resolveAction({ ok: true });
        await flushPromises();

        expect(wrapper.emitted("completed")).toBeUndefined();
    });

    it("retries a failed branch entry before navigating", async () => {
        const beforeEnter = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(undefined);
        const wrapper = mount(NestedChoicePanel, {
            props: {
                choices: [{ type: "branch", id: "branch", title: "Branch", artwork: "branch.png", beforeEnter, children: [action("leaf")] }],
                backLabel: "Back",
                retryLabel: "Retry",
            },
        });

        await wrapper.get('[data-choice-id="branch"]').trigger("click");
        expect(wrapper.get('[data-testid="choice-panel-error"]').text()).toContain("Unavailable");

        await wrapper.get('[data-testid="choice-panel-retry"]').trigger("click");
        expect(beforeEnter).toHaveBeenCalledTimes(2);
        expect(wrapper.findAll('[data-choice-id="leaf"]').length > 0).toBe(true);
    });

    it("keeps an async action pending and emits completion only after success", async () => {
        let resolveAction!: (result: { ok: true }) => void;
        const run = vi.fn(() => new Promise<{ ok: true }>((resolve) => (resolveAction = resolve)));
        const wrapper = mount(NestedChoicePanel, {
            props: {
                choices: [action("launch", run)],
                backLabel: "Back",
                pendingLabel: "Preparing",
            },
        });

        await wrapper.get('[data-choice-id="launch"]').trigger("click");
        expect(wrapper.get('[data-testid="choice-panel-pending"]').text()).toContain("Preparing");
        expect(run).toHaveBeenCalledTimes(1);
        expect(wrapper.emitted("completed")).toBeUndefined();

        resolveAction({ ok: true });
        await flushPromises();

        expect(wrapper.emitted("completed")).toEqual([["launch"]]);
    });

    it("shows failures, retries the active action, and backs out of the error", async () => {
        const run = vi.fn().mockResolvedValueOnce({ ok: false, message: "Unavailable" }).mockResolvedValueOnce({ ok: true });
        const wrapper = mount(NestedChoicePanel, {
            props: {
                choices: [action("launch", run)],
                backLabel: "Back",
                pendingLabel: "Preparing",
                failureLabel: "Could not prepare",
                retryLabel: "Retry",
            },
        });

        await wrapper.get('[data-choice-id="launch"]').trigger("click");
        expect(wrapper.get('[data-testid="choice-panel-error"]').text()).toContain("Unavailable");
        expect(wrapper.findAll('[data-testid="choice-panel-retry"]').length).toBeGreaterThan(0);
        expect(wrapper.emitted("completed")).toBeUndefined();

        await wrapper.get('[data-testid="choice-panel-retry"]').trigger("click");
        await flushPromises();
        expect(run).toHaveBeenCalledTimes(2);
        expect(wrapper.emitted("completed")).toEqual([["launch"]]);

        const failingRun = vi.fn().mockResolvedValue({ ok: false, message: "Still unavailable" });
        await wrapper.setProps({ choices: [action("other", failingRun)] });
        await wrapper.setProps({ resetKey: 2 });
        await wrapper.get('[data-choice-id="other"]').trigger("click");
        await wrapper.get('[data-testid="choice-panel-back-error"]').trigger("click");
        expect(wrapper.findAll('[data-choice-id="other"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-testid="choice-panel-error"]').length > 0).toBe(false);
    });
});

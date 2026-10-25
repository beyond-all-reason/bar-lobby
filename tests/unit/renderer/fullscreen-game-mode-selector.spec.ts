// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import FullscreenGameModeSelector from "@renderer/components/battle/FullscreenGameModeSelector.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const battleStore = vi.hoisted(() => ({
    isLobbyOpened: false,
    isSelectingGameMode: true,
}));

vi.mock("@renderer/store/battle.store", () => ({ battleStore }));

vi.mock("@renderer/components/misc/GameModeSelector.vue", () => ({
    default: {
        name: "GameModeSelector",
        emits: ["selected"],
        template: '<button data-testid="select-mode" @click="$emit(\'selected\')">Select</button>',
    },
}));

describe("FullscreenGameModeSelector", () => {
    beforeEach(() => {
        battleStore.isLobbyOpened = false;
        battleStore.isSelectingGameMode = true;
    });

    it("opens the battle room after a successful mode selection", async () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get('[data-testid="select-mode"]').trigger("click");

        expect(battleStore.isSelectingGameMode).toBe(false);
        expect(battleStore.isLobbyOpened).toBe(true);
        expect(wrapper.emitted("closed")).toHaveLength(1);
    });

    it("dismisses the backdrop without opening the battle room", async () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.trigger("click");

        expect(battleStore.isSelectingGameMode).toBe(false);
        expect(battleStore.isLobbyOpened).toBe(false);
        expect(wrapper.emitted("closed")).toBeUndefined();
    });

    it("does not dismiss when selector content is clicked", async () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get(".gamemode-container").trigger("click");

        expect(battleStore.isSelectingGameMode).toBe(true);
        expect(battleStore.isLobbyOpened).toBe(false);
    });
});

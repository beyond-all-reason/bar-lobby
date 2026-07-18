// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { GameModeID } from "@main/game/battle/battle-types";
import FullscreenGameModeSelector from "@renderer/components/battle/FullscreenGameModeSelector.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const battleStore = vi.hoisted(() => ({
    isLobbyOpened: false,
    isSelectingGameMode: true,
}));

const createBeginnerSkirmish = vi.hoisted(() => vi.fn());
const loadGameMode = vi.hoisted(() => vi.fn());
const resetToDefaultBattle = vi.hoisted(() => vi.fn());

vi.mock("@renderer/store/battle.store", () => ({
    battleStore,
    battleActions: { createBeginnerSkirmish, loadGameMode, resetToDefaultBattle },
}));

vi.mock("@renderer/i18n", () => ({
    useTypedI18n: () => ({ t: (key: string) => key }),
}));

describe("FullscreenGameModeSelector", () => {
    beforeEach(() => {
        battleStore.isLobbyOpened = false;
        battleStore.isSelectingGameMode = true;
        createBeginnerSkirmish.mockReset();
        createBeginnerSkirmish.mockResolvedValue({ ok: true });
        loadGameMode.mockReset();
        loadGameMode.mockResolvedValue(undefined);
        resetToDefaultBattle.mockReset();
    });

    it("opens with only Quick Start and Custom Skirmish choices", () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        expect(wrapper.findAll('[data-choice-id="quick-start"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="custom-skirmish"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="classic"]').length > 0).toBe(false);
    });

    it("keeps Quick Start pending until the preset succeeds", async () => {
        let resolvePreset!: (result: { ok: true }) => void;
        createBeginnerSkirmish.mockImplementationOnce(() => new Promise<{ ok: true }>((resolve) => (resolvePreset = resolve)));
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get('[data-choice-id="quick-start"]').trigger("click");

        expect(wrapper.findAll('[data-testid="choice-panel-pending"]').length > 0).toBe(true);
        expect(battleStore.isSelectingGameMode).toBe(true);
        expect(battleStore.isLobbyOpened).toBe(false);
        expect(wrapper.emitted("closed")).toBeUndefined();

        resolvePreset({ ok: true });
        await flushPromises();

        expect(battleStore.isSelectingGameMode).toBe(false);
        expect(battleStore.isLobbyOpened).toBe(true);
        expect(wrapper.emitted("closed")).toHaveLength(1);
    });

    it("keeps Quick Start open with a localized failure and retry", async () => {
        createBeginnerSkirmish.mockResolvedValueOnce({ ok: false, reason: "no-eligible-map" });
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get('[data-choice-id="quick-start"]').trigger("click");
        expect(wrapper.get('[data-testid="choice-panel-error"]').text()).toContain("skirmishEntryChooser.noEligibleMap");
        expect(battleStore.isSelectingGameMode).toBe(true);
        expect(battleStore.isLobbyOpened).toBe(false);

        await wrapper.get('[data-testid="choice-panel-retry"]').trigger("click");
        expect(createBeginnerSkirmish).toHaveBeenCalledTimes(2);
    });

    it("resets the battle before entering Custom Skirmish", async () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get('[data-choice-id="custom-skirmish"]').trigger("click");

        expect(resetToDefaultBattle).toHaveBeenCalledTimes(1);
        expect(wrapper.findAll('[data-choice-id="quick-start"]').length > 0).toBe(false);
        expect(wrapper.findAll('[data-choice-id="classic"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="raptors"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="scavengers"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="ffa"]').length > 0).toBe(true);
    });

    it("loads a custom mode before opening the battle room", async () => {
        let resolveLoad!: () => void;
        loadGameMode.mockImplementationOnce(() => new Promise<void>((resolve) => (resolveLoad = resolve)));
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get('[data-choice-id="custom-skirmish"]').trigger("click");
        await wrapper.get('[data-choice-id="classic"]').trigger("click");

        expect(loadGameMode).toHaveBeenCalledWith(GameModeID.CLASSIC);
        expect(battleStore.isSelectingGameMode).toBe(true);
        expect(battleStore.isLobbyOpened).toBe(false);

        resolveLoad();
        await flushPromises();

        expect(battleStore.isSelectingGameMode).toBe(false);
        expect(battleStore.isLobbyOpened).toBe(true);
    });

    it("returns from Custom Skirmish to the root choices", async () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get('[data-choice-id="custom-skirmish"]').trigger("click");
        await wrapper.get('[data-testid="choice-panel-back"]').trigger("click");

        expect(wrapper.findAll('[data-choice-id="quick-start"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="custom-skirmish"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="classic"]').length > 0).toBe(false);
        expect(battleStore.isLobbyOpened).toBe(false);
    });

    it("dismisses without opening the battle room", async () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.trigger("click");

        expect(battleStore.isSelectingGameMode).toBe(false);
        expect(battleStore.isLobbyOpened).toBe(false);
        expect(wrapper.emitted("closed")).toBeUndefined();
    });

    it("reopens at the root after closing from Custom Skirmish", async () => {
        const wrapper = mount(FullscreenGameModeSelector, { props: { visible: true } });

        await wrapper.get('[data-choice-id="custom-skirmish"]').trigger("click");
        await wrapper.setProps({ visible: false });
        await wrapper.setProps({ visible: true });

        expect(wrapper.findAll('[data-choice-id="quick-start"]').length > 0).toBe(true);
        expect(wrapper.findAll('[data-choice-id="classic"]').length > 0).toBe(false);
    });
});

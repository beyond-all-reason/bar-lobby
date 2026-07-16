// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BotParticipant from "@renderer/components/battle/BotParticipant.vue";
import { Faction, type Bot } from "@main/game/battle/battle-types";

const { updateBotFaction, updateBotOptions } = vi.hoisted(() => ({
    updateBotFaction: vi.fn(),
    updateBotOptions: vi.fn(),
}));

vi.mock("@renderer/store/battle.store", () => ({
    battleActions: {
        duplicateBot: vi.fn(),
        removeBot: vi.fn(),
        updateBotFaction,
        updateBotOptions,
    },
}));

vi.mock("@renderer/store/engine.store", () => ({
    enginesStore: {
        selectedEngineVersion: {
            ais: [],
        },
    },
}));

vi.mock("@renderer/store/game.store", () => ({
    gameStore: {
        selectedGameVersion: {
            ais: [
                {
                    name: "BARb",
                    options: [
                        {
                            key: "general",
                            name: "General",
                            type: "section",
                            options: [
                                {
                                    key: "difficulty",
                                    name: "Difficulty",
                                    type: "list",
                                    default: "beginner",
                                    options: [
                                        { key: "beginner", name: "Beginner", type: "string" },
                                        { key: "normal", name: "Normal", type: "string" },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
}));

const SelectStub = defineComponent({
    name: "BotSelect",
    props: {
        modelValue: { type: String, required: false },
        options: { type: Array, required: true },
    },
    emits: ["update:modelValue"],
    template: `
        <button :data-test="$attrs['data-test']">
            {{ options.find((option) => option.key === modelValue || option.value === modelValue)?.name ?? modelValue }}
        </button>
    `,
});

const TeamParticipantStub = defineComponent({
    name: "TeamParticipant",
    template: "<div><slot /></div>",
});

const bot: Bot = {
    id: 1,
    host: 2,
    name: "BARb",
    aiShortName: "BARb",
    faction: Faction.Armada,
    aiOptions: {},
};

function mountBotParticipant(options: Record<string, unknown> = {}) {
    return mount(BotParticipant, {
        props: {
            bot: { ...bot, aiOptions: options },
            teamId: 0,
        },
        global: {
            stubs: {
                ContextMenu: true,
                Icon: true,
                LuaOptionsModal: true,
                Select: SelectStub,
                TeamParticipant: TeamParticipantStub,
            },
        },
    });
}

describe("BotParticipant", () => {
    beforeEach(() => {
        updateBotFaction.mockReset();
        updateBotOptions.mockReset();
    });

    it("shows direct faction and effective default difficulty controls for a bot", () => {
        const wrapper = mountBotParticipant();

        expect(wrapper.find('[data-test="bot-faction"]').text()).toBe(Faction.Armada);
        expect(wrapper.find('[data-test="bot-difficulty"]').text()).toBe("Beginner");
    });

    it("updates the bot faction and difficulty directly from the row", async () => {
        const wrapper = mountBotParticipant({ difficulty: "beginner" });
        const [factionControl, difficultyControl] = wrapper.findAllComponents(SelectStub);

        await factionControl.vm.$emit("update:modelValue", Faction.Cortex);
        await difficultyControl.vm.$emit("update:modelValue", "normal");

        expect(updateBotFaction).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), Faction.Cortex);
        expect(updateBotOptions).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), { difficulty: "normal" });
    });
});

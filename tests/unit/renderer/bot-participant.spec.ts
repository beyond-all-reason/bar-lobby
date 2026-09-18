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
            ais: [
                {
                    name: "BARbarIAn",
                    shortName: "BARb",
                    options: [
                        {
                            key: "performance",
                            name: "Performance Relevant Settings",
                            type: "section",
                            options: [
                                {
                                    key: "profile",
                                    name: "Difficulty profile",
                                    type: "list",
                                    default: "hard",
                                    options: [{ key: "dev", name: "Testing AI", type: "string" }],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
}));

vi.mock("@renderer/store/game.store", () => ({
    gameStore: {
        selectedGameVersion: {
            ais: [],
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

    it("shows direct faction and BARb's effective default difficulty profile", () => {
        const wrapper = mountBotParticipant();

        expect(wrapper.find('[data-test="bot-faction"]').text()).toBe(Faction.Armada);
        expect(wrapper.find('[data-test="bot-difficulty"]').text()).toBe("Hard | Balanced");
    });

    it("updates the bot faction and difficulty profile directly from the row", async () => {
        const wrapper = mountBotParticipant({ profile: "hard" });
        const [factionControl, difficultyControl] = wrapper.findAllComponents(SelectStub);

        await factionControl.vm.$emit("update:modelValue", Faction.Cortex);
        await difficultyControl.vm.$emit("update:modelValue", "easy");

        expect(updateBotFaction).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), Faction.Cortex);
        expect(updateBotOptions).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), { profile: "easy" });
    });
});

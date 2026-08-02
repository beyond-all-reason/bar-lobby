// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { GameModeID } from "@main/game/battle/battle-types";
import GameModeSelector from "@renderer/components/misc/GameModeSelector.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadGameMode = vi.hoisted(() => vi.fn());

vi.mock("@renderer/store/battle.store", () => ({
    battleActions: { loadGameMode },
}));

vi.mock("@renderer/i18n", () => ({
    useTypedI18n: () => ({ t: (key: string) => key }),
}));

describe("GameModeSelector", () => {
    beforeEach(() => {
        loadGameMode.mockReset();
    });

    it("waits for Classic initialization before reporting selection", async () => {
        let resolveLoad: () => void;
        loadGameMode.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    resolveLoad = resolve;
                })
        );
        const wrapper = mount(GameModeSelector);

        await wrapper.get(".classic").trigger("click");

        expect(loadGameMode).toHaveBeenCalledWith(GameModeID.CLASSIC);
        expect(wrapper.emitted("selected")).toBeUndefined();

        resolveLoad!();
        await flushPromises();

        expect(wrapper.emitted("selected")).toHaveLength(1);
    });
});

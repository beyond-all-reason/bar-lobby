// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { BattleEndedEventData } from "tachyon-protocol/types";

vi.mock("@renderer/router", () => ({ router: { push: vi.fn() } }));

Object.assign(window.tachyon, { disconnect: vi.fn(async () => {}), onConnected: vi.fn() });
Object.defineProperty(window, "auth", {
    value: {
        logout: vi.fn(async () => {}),
        getState: vi.fn(async () => ({ authenticated: false })),
        getIdentity: vi.fn(async () => undefined),
        hasCredentials: vi.fn(async () => false),
        login: vi.fn(async () => {}),
        onChanged: vi.fn(),
    },
    writable: true,
});

const { battleHistoryStore, battleHistoryActions } = await import("@renderer/store/battleHistory.store");
const { recordBattleEnded, clearBattleHistory } = battleHistoryActions;
const { useBattleResults } = await import("@renderer/composables/useBattleResults");
const { auth, me } = await import("@renderer/store/me.store");
const { subsManager } = await import("@renderer/store/users.store");
const { onWentOffline } = await import("@renderer/utils/offline-signal");

function battle(overrides: Partial<BattleEndedEventData> = {}): BattleEndedEventData {
    return { battleId: "battle-1", players: [], bots: [], spectators: [], winningAllyTeamIds: [], ...overrides };
}

beforeEach(async () => {
    clearBattleHistory();
    useBattleResults().close();
    await nextTick();
});

describe("recordBattleEnded", () => {
    it("appends each ended battle in order", () => {
        recordBattleEnded(battle({ battleId: "first" }));
        recordBattleEnded(battle({ battleId: "second" }));

        expect(battleHistoryStore.entries.map((entry) => entry.id)).toEqual(["first", "second"]);
    });

    it("ignores the same battle ending twice", () => {
        recordBattleEnded(battle({ battleId: "first" }));
        recordBattleEnded(battle({ battleId: "first" }));

        expect(battleHistoryStore.entries).toHaveLength(1);
    });
});

describe("useBattleResults", () => {
    it("opens with the reveal on the latest recorded battle", () => {
        recordBattleEnded(battle({ battleId: "first" }));
        recordBattleEnded(battle({ battleId: "second" }));

        const { isOpen, entry, reveal } = useBattleResults();
        expect(isOpen.value).toBe(true);
        expect(entry.value?.id).toBe("second");
        expect(reveal.value).toBe(true);
    });

    it("reopens from history without the reveal", () => {
        recordBattleEnded(battle({ battleId: "first" }));
        const results = useBattleResults();
        results.close();

        results.show(battleHistoryStore.entries[0]);

        expect(results.isOpen.value).toBe(true);
        expect(results.reveal.value).toBe(false);
    });

    it("closes when the history is cleared", async () => {
        recordBattleEnded(battle());

        clearBattleHistory();
        await nextTick();

        expect(useBattleResults().isOpen.value).toBe(false);
    });
});

describe("participant subscriptions", () => {
    const participants = battle({
        players: [
            { userId: "a", name: "a", allyTeam: "0", team: "0", player: "0" },
            { userId: me.userId, name: "me", allyTeam: "1", team: "1", player: "0" },
        ],
        spectators: [{ userId: "b", name: "b" }],
    });

    it("subscribes to everyone but me while open", async () => {
        recordBattleEnded(participants);
        await nextTick();

        expect(subsManager.getAllUsersSubscribed().sort()).toEqual(["a", "b"]);
    });

    it("unsubscribes when closed", async () => {
        recordBattleEnded(participants);
        await nextTick();

        useBattleResults().close();
        await nextTick();

        expect(subsManager.getAllUsersSubscribed()).toEqual([]);
    });

    it("unsubscribes on going offline", async () => {
        recordBattleEnded(participants);
        await nextTick();

        onWentOffline.dispatch();

        expect(subsManager.getAllUsersSubscribed()).toEqual([]);
    });
});

describe("logout", () => {
    it("clears the history and closes the results", async () => {
        recordBattleEnded(battle());

        const loggingOut = auth.logout();
        await nextTick();

        expect(battleHistoryStore.entries).toHaveLength(0);
        expect(useBattleResults().isOpen.value).toBe(false);
        await loggingOut;
    });
});

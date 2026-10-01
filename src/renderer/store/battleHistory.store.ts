// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";
import type { BattleEndedEventData } from "tachyon-protocol/types";
import { Signal } from "$/jaz-ts-utils/signal";
import type { BattleHistoryEntry } from "@renderer/model/battleResults";

const state = reactive<{ entries: BattleHistoryEntry[] }>({
    entries: [],
});

export const battleHistoryStore = readonly(state);

export const onBattleRecorded = new Signal<BattleHistoryEntry>();

function recordBattleEnded(data: BattleEndedEventData) {
    if (state.entries.some((entry) => entry.id === data.battleId)) return;

    const entry: BattleHistoryEntry = { id: data.battleId, receivedAt: Date.now(), data };
    state.entries.push(entry);
    onBattleRecorded.dispatch(entry);
}

function clearBattleHistory() {
    state.entries.splice(0);
}

export const battleHistoryActions = {
    recordBattleEnded,
    clearBattleHistory,
};

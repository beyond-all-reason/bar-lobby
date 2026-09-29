// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import type { BattleEndedEventData } from "tachyon-protocol/types";
import { Signal } from "$/jaz-ts-utils/signal";
import type { BattleHistoryEntry } from "@renderer/model/battleResults";

export const battleHistory = reactive<BattleHistoryEntry[]>([]);

export const onBattleRecorded = new Signal<BattleHistoryEntry>();

export function recordBattleEnded(data: BattleEndedEventData) {
    if (battleHistory.some((entry) => entry.id === data.battleId)) return;

    const entry: BattleHistoryEntry = { id: data.battleId, receivedAt: Date.now(), data };
    battleHistory.push(entry);
    onBattleRecorded.dispatch(entry);
}

export function clearBattleHistory() {
    battleHistory.splice(0);
}

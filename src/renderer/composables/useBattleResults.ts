// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, watch, type Ref } from "vue";
import type { BattleHistoryEntry } from "@renderer/model/battleResults";
import { battleHistory, onBattleRecorded } from "@renderer/store/battleHistory.store";
import { me } from "@renderer/store/me.store";
import { subsManager } from "@renderer/store/users.store";
import { onWentOffline } from "@renderer/utils/offline-signal";

const isOpen = ref(false);
const entry = ref<BattleHistoryEntry | null>(null);
const reveal = ref(false);

function show(historyEntry: BattleHistoryEntry, options: { reveal?: boolean } = {}) {
    entry.value = historyEntry;
    reveal.value = options.reveal ?? false;
    isOpen.value = true;
}

function close() {
    isOpen.value = false;
    reveal.value = false;
}

export function useBattleResults() {
    return {
        isOpen: isOpen as Ref<boolean>,
        entry: entry as Ref<BattleHistoryEntry | null>,
        reveal: reveal as Ref<boolean>,
        show,
        close,
    };
}

onBattleRecorded.add((recorded) => show(recorded, { reveal: true }));

watch(
    () => entry.value !== null && !battleHistory.includes(entry.value),
    (removed) => {
        if (removed) close();
    },
    { flush: "sync" }
);

const subscriptionSymbol = Symbol("useBattleResults");

watch([isOpen, entry], ([open, current]) => {
    subsManager.clearAllFromList(subscriptionSymbol);
    if (!open || !current) return;

    const userIds = [...current.data.players, ...current.data.spectators].map((participant) => participant.userId).filter((id) => id !== me.userId);
    if (userIds.length) subsManager.attach(userIds, subscriptionSymbol);
});

onWentOffline.add(() => subsManager.clearAllFromList(subscriptionSymbol));

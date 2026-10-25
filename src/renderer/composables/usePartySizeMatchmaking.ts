// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { matchmakingStore } from "@renderer/store/matchmaking.store";
import { partyStore } from "@renderer/store/party.store";
import { ref, watch } from "vue";

export function usePartySizeMatchmaking() {
    const partyTooLarge = ref(false);

    watch(
        () => ({
            activeParty: partyStore.activeParty,
            queueId: matchmakingStore.selectedQueue,
            playlists: [...matchmakingStore.playlists],
            // Spreading map entries forces Vue to evaluate the Map's contents
            members: [...(partyStore.parties.get(partyStore.activeParty ?? "")?.members ?? [])],
            invited: [...(partyStore.parties.get(partyStore.activeParty ?? "")?.invited ?? [])],
        }),
        (newData) => {
            const { activeParty, queueId, playlists } = newData;

            if (!activeParty || !queueId || !playlists.length) {
                partyTooLarge.value = false;
                return;
            }

            const party = partyStore.parties.get(activeParty);
            const playlist = playlists.find((p) => p.id === queueId);

            if (!party || !playlist) {
                partyTooLarge.value = false;
                return;
            }

            partyTooLarge.value = party.members.length > playlist.teamSize;
        },
        { immediate: true }
    );

    return {
        partyTooLarge,
    };
}

export function getPartySize() {
    const activeParty = partyStore.activeParty;
    if (!activeParty) {
        return 0;
    }

    const party = partyStore.parties.get(activeParty);
    if (!party) {
        return 0;
    }

    return party.members.length;
}

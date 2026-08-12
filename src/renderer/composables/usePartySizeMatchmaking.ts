// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { matchmakingStore } from "@renderer/store/matchmaking.store";
import { partyStore } from "@renderer/store/party.store";
import { ref, watch } from "vue";

const partyTooLarge = ref(false);

export function usePartySizeMatchmaking() {
    watch(
        () => ({
            activeParty: partyStore.activeParty,
            queue: matchmakingStore.selectedQueue,
            // Spreading map entries forces Vue to evaluate the Map's contents
            members: [...(partyStore.parties.get(partyStore.activeParty ?? "")?.members ?? [])],
            invited: [...(partyStore.parties.get(partyStore.activeParty ?? "")?.invited ?? [])],
        }),
        (newData) => {
            /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
            const { activeParty, queue, members, invited } = newData;

            if (!activeParty || !queue) {
                partyTooLarge.value = false;
                return;
            }

            const party = partyStore.parties.get(activeParty);
            const playlist = matchmakingStore.playlists.find((p) => p.id === queue);

            if (!party || !playlist) {
                partyTooLarge.value = false;
                return;
            }

            partyTooLarge.value = party.members.length > playlist.teamSize;
        },
        { immediate: true, deep: true }
    );

    return {
        partyTooLarge,
    };
}

// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { useNow } from "@vueuse/core";
import { computed } from "vue";
import { lobbyStore } from "@renderer/store/lobby.store";
import { me } from "@renderer/store/me.store";
import { setupI18n } from "@renderer/i18n";

const i18n = setupI18n();

export type ActiveLobbyRole = "player" | "queued" | "spectator";

/**
 * Derived, display-oriented state about the lobby the client is currently in.
 */
export function useActiveLobbyStatus() {
    const lobby = computed(() => lobbyStore.activeLobby);

    const role = computed<ActiveLobbyRole | null>(() => {
        const activeLobby = lobby.value;
        if (!activeLobby) return null;
        if (Object.values(activeLobby.players).some((player) => player.id === me.userId)) {
            return "player";
        }
        const spectator = Object.values(activeLobby.spectators).find((member) => member.id === me.userId);
        if (!spectator) return null;
        return spectator.joinQueuePosition !== undefined ? "queued" : "spectator";
    });

    const isBoss = computed(() => Boolean(lobby.value?.bosses && me.userId in lobby.value.bosses));

    // 1-based, matching the "Team N" labels in the lobby view.
    const teamNumber = computed(() => {
        if (role.value !== "player" || !lobby.value) return null;
        const player = Object.values(lobby.value.players).find((p) => p.id === me.userId);
        return player ? Number(player.allyTeam) + 1 : null;
    });

    // 1-based rank within the sorted queue, since joinQueuePosition values aren't guaranteed to be contiguous.
    const queuePosition = computed(() => {
        if (!lobby.value?.playerQueue) return null;
        const index = [...lobby.value.playerQueue.values()].indexOf(me.userId);
        return index === -1 ? null : index + 1;
    });

    // Max players per ally team, in ally team order.
    const allyTeamSizes = computed(() => {
        if (!lobby.value?.allyTeamConfig) return [];
        return Object.entries(lobby.value.allyTeamConfig)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, allyTeam]) => Object.values(allyTeam.teams).reduce((sum, team) => sum + team.maxPlayers, 0));
    });

    const vote = computed(() => lobby.value?.currentVote ?? null);

    // Only players take part in votes, so spectators never get the vote indicator.
    const hasVote = computed(() => role.value === "player" && vote.value !== null);
    const needsMyVote = computed(() => hasVote.value && vote.value?.voters[me.userId]?.vote === "pending");

    const playerSummary = computed(() => {
        if (!lobby.value) return "";
        return i18n.global.t("lobby.components.battle.activeLobbyPreview.playersCount", { count: `${lobby.value.playerCount + lobby.value.botCount}/${lobby.value.maxPlayerCount}` });
    });

    const now = useNow({ interval: 1000 });
    const battleDurationMs = computed(() => {
        const startedAt = lobby.value?.currentBattle?.startedAt;
        if (startedAt === undefined) return null;
        // UnixTime is in microseconds.
        return Math.max(0, now.value.getTime() - startedAt / 1000);
    });

    const voteTimeLeftMs = computed(() => {
        const until = vote.value?.until;
        if (until === undefined) return null;
        // UnixTime is in microseconds.
        return Math.max(0, until / 1000 - now.value.getTime());
    });

    return {
        lobby,
        role,
        isBoss,
        teamNumber,
        queuePosition,
        allyTeamSizes,
        vote,
        hasVote,
        needsMyVote,
        voteTimeLeftMs,
        playerSummary,
        battleDurationMs,
    };
}

// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { UserId, VoteActions } from "tachyon-protocol/types";
import { t } from "@renderer/i18n";
import { db } from "@renderer/store/db";
import { lobbyStore } from "@renderer/store/lobby.store";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";

/**
 * Human-readable descriptions of lobby votes, resolving user ids to display names.
 * Call getVoteString inside a computed or render so it updates with the locale and the known users.
 */
export function useVoteString() {
    const displayNames = useDexieLiveQueryWithDeps(lobbyStore.activeLobby, async () => {
        const map = new Map<UserId, string>();
        await db.users.each(function (user) {
            map.set(user.userId, user.username);
        });
        return map;
    });

    function getUserName(userId: UserId) {
        return displayNames.value?.get(userId) ?? userId;
    }

    function getVoteString(voteAction: VoteActions | undefined) {
        if (!voteAction?.type) return "";
        switch (voteAction.type) {
            case "kickban":
                if (voteAction.banUntil)
                    return t("lobby.components.battle.votePanel.actions.kickban", {
                        target: getUserName(voteAction.userId),
                        banUntil: voteAction.banUntil,
                    });
                else
                    return t("lobby.components.battle.votePanel.actions.kickOnly", {
                        target: getUserName(voteAction.userId),
                    });
            case "changeMap":
                return t("lobby.components.battle.votePanel.actions.changeMap", { newMapName: voteAction.newMapName });
            case "appointBoss":
                return t("lobby.components.battle.votePanel.actions.appointBoss", {
                    target: getUserName(voteAction.bossId),
                });
            case "start":
                return t("lobby.components.battle.votePanel.actions.start");
            default:
                return "";
        }
    }

    return { displayNames, getUserName, getVoteString };
}

// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { UnixTime, UserId, VoteActions } from "tachyon-protocol/types";
import { i18n, t } from "@renderer/i18n";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";

/** The user a vote action targets, if any. */
export function getVoteActionUserId(voteAction: VoteActions | undefined): UserId | undefined {
    switch (voteAction?.type) {
        case "kickban":
            return voteAction.userId;
        case "appointBoss":
            return voteAction.bossId;
        default:
            return undefined;
    }
}

/** A date and time in the current locale. UnixTime is in microseconds. */
function formatUnixTime(time: UnixTime) {
    return new Intl.DateTimeFormat(i18n.global.locale.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(time / 1000));
}

/**
 * Human-readable descriptions of lobby votes, resolving user ids to display names.
 * Call getVoteString inside a computed or render so it updates with the locale and the known users.
 * @param userIds The users whose names will be needed, e.g. vote initiators and targets.
 */
export function useVoteString(userIds: MaybeRefOrGetter<(UserId | undefined)[]>) {
    const ids = computed(() => [...new Set(toValue(userIds).filter((id): id is UserId => id !== undefined))].sort());

    // Keyed on the joined ids so the query only restarts when the set of users changes, not on every new array.
    const displayNames = useDexieLiveQueryWithDeps(
        () => ids.value.join(","),
        async () => {
            const map = new Map<UserId, string>();
            const users = await db.users.bulkGet(ids.value);
            for (const user of users) {
                if (user) map.set(user.userId, user.username);
            }
            return map;
        }
    );

    function getUserName(userId: UserId) {
        return displayNames.value?.get(userId) ?? t("lobby.navbar.messages.userID", { id: userId });
    }

    function getVoteString(voteAction: VoteActions | undefined) {
        if (!voteAction?.type) return "";
        switch (voteAction.type) {
            case "kickban":
                if (voteAction.banUntil)
                    return t("lobby.components.battle.votePanel.actions.kickban", {
                        target: getUserName(voteAction.userId),
                        banUntil: formatUnixTime(voteAction.banUntil),
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

    return { getUserName, getVoteString };
}

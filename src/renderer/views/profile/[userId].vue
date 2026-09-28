<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Profile", hide: true, transition: { name: "slide-left" } } }
</route>
<template>
    <div>
        <Panel class="profile-container" v-if="user">
            <div class="profile-header">
                <img ref="logo" class="avatar" src="/src/renderer/assets/images/BARLogoFull.png" />
                <div class="profile-user-info">
                    <h2 class="flex-row gap-lg">
                        <Flag :countryCode="user.countryCode" style="width: 50px" />
                        {{ user.displayName }}
                    </h2>
                    <p>{{ t("lobby.views.profile.status") }}{{ user.status }}</p>
                    <p>{{ t("lobby.views.profile.clan") }}{{ user.clanId }}</p>
                    <Button v-if="user.userId !== me.userId" class="slim inline" @click="openReportUser(user)">
                        <ReportUserIcon />
                        <span class="margin-left-sm">{{ t("lobby.components.user.reportUser.menuLabel") }}</span>
                    </Button>
                </div>
            </div>
        </Panel>
        <Panel v-if="user && user.userId === me.userId" class="battle-history-panel">
            <h3>{{ t("lobby.views.profile.battleHistory.title") }}</h3>
            <p v-if="battleHistory.length === 0">{{ t("lobby.views.profile.battleHistory.empty") }}</p>
            <div v-else class="battle-history">
                <div v-for="entry in battleHistory" :key="entry.id" class="battle-history-entry">
                    <Icon :icon="crown" height="20" class="crown" :class="{ hidden: !wonBattle(entry) }" />
                    <span class="time">{{ new Date(entry.receivedAt).toLocaleString() }}</span>
                    <span class="summary">{{ summarize(entry) }}</span>
                    <Button class="slim" @click="battleResults.show(entry)">{{
                        t("lobby.views.profile.battleHistory.viewResults")
                    }}</Button>
                </div>
            </div>
        </Panel>
        <Panel class="profile-container" v-else-if="!user">
            <p>{{ t("lobby.views.profile.userNotFound") }}</p>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import Flag from "@renderer/components/misc/Flag.vue";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import ReportUserIcon from "@renderer/components/user/ReportUserIcon.vue";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { useReportUser } from "@renderer/composables/useReportUser";
import { db } from "@renderer/store/db";
import { battleHistory, me } from "@renderer/store/me.store";
import { useTypedI18n } from "@renderer/i18n";
import { Icon } from "@iconify/vue";
import crown from "@iconify-icons/mdi/crown";
import type { BattleHistoryEntry } from "@renderer/model/battleResults";
import { useBattleResults } from "@renderer/composables/useBattleResults";
const { t } = useTypedI18n();
const { openReportUser } = useReportUser();
const battleResults = useBattleResults();

function wonBattle(entry: BattleHistoryEntry) {
    const myAllyTeam = entry.data.players.find((player) => player.userId === me.userId)?.allyTeam;
    return myAllyTeam !== undefined && entry.data.winningAllyTeamIds.includes(myAllyTeam);
}

// Reads like "2v2" or "1v1v1", with any bots counted separately.
function summarize(entry: BattleHistoryEntry) {
    const teamSizes = new Map<string, number>();
    for (const participant of [...entry.data.players, ...entry.data.bots]) {
        teamSizes.set(participant.allyTeam, (teamSizes.get(participant.allyTeam) ?? 0) + 1);
    }
    const sizes = [...teamSizes.values()].join("v");
    const bots = entry.data.bots.length;
    return bots ? `${sizes} · ${t("lobby.views.profile.battleHistory.bots", bots)}` : sizes;
}

const props = defineProps<{
    userId: string;
}>();

const user = useDexieLiveQueryWithDeps([() => props.userId], () => {
    return db.users.get(props.userId);
});
</script>

<style lang="scss" scoped>
.profile-container {
    display: flex;
    height: 100%;
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    margin-top: 25px;
    div {
        margin-right: auto;
    }
}

.avatar {
    width: 184px;
    height: 184px;
    border-radius: 1%;
    margin-right: 20px;
    border: 1px solid #5e5757;
    backdrop-filter: blur(2px);
}

.battle-history-panel {
    margin-top: 15px;
}

.battle-history {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 10px;
}

.battle-history-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    .summary {
        flex-grow: 1;
        opacity: 0.8;
    }
}

.crown {
    color: gold;
    &.hidden {
        visibility: hidden;
    }
}

.profile-user-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
}
</style>

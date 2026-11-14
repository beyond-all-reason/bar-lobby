<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Profile", hide: true, transition: { name: "slide-left" } } }
</route>
<template>
    <div>
        <Panel class="profile-container profile-header-panel" v-if="user">
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
            <p v-if="historyRows.length === 0">{{ t("lobby.views.profile.battleHistory.empty") }}</p>
            <div v-else class="battle-history">
                <div
                    v-for="row in historyRows"
                    :key="row.entry.id"
                    class="battle-history-entry"
                    v-tooltip.top="t('lobby.views.profile.battleHistory.viewResults')"
                    @click="battleResults.show(row.entry)"
                >
                    <Icon :icon="crown" height="20" class="crown" :class="{ hidden: !row.won }" />
                    <span class="time">{{ row.time }}</span>
                    <span class="summary">{{ row.summary }}</span>
                    <Icon :icon="chevronRight" height="20" class="chevron" />
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
import { me } from "@renderer/store/me.store";
import { battleHistoryStore } from "@renderer/store/battleHistory.store";
import { useTypedI18n } from "@renderer/i18n";
import { Icon } from "@iconify/vue";
import crown from "@iconify-icons/mdi/crown";
import chevronRight from "@iconify-icons/mdi/chevron-right";
import { computed } from "vue";
import { useBattleResults } from "@renderer/composables/useBattleResults";
import { buildBattleResultsView, summarizeBattle } from "@renderer/components/battle/results/battleResults.utils";
const { t, locale } = useTypedI18n();
const { openReportUser } = useReportUser();
const battleResults = useBattleResults();

const historyRows = computed(() => {
    const timeFormat = new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" });
    return [...battleHistoryStore.entries].reverse().map((entry) => {
        const { teamSizes, bots } = summarizeBattle(entry.data);
        return {
            entry,
            won: buildBattleResultsView(entry.data, me.userId).iWon,
            time: timeFormat.format(entry.receivedAt),
            summary: bots ? `${teamSizes} · ${t("lobby.views.profile.battleHistory.bots", bots)}` : teamSizes,
        };
    });
});

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

.profile-header-panel {
    flex: none;
    height: auto;
}

.battle-history-panel {
    margin-top: 15px;
    flex: 0 1 auto;
    min-height: 0;
}

.battle-history {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 10px;
    min-height: 0;
    overflow-y: auto;
    padding-right: 5px;
}

.battle-history-entry {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    cursor: pointer;
    &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
    }
    .summary {
        flex-grow: 1;
        opacity: 0.8;
    }
    .chevron {
        opacity: 0.6;
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

<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal
        v-model="modalOpen"
        :style="{ width: layout === 'list' ? '600px' : layout === 'twoColumn' ? '800px' : '1100px', maxWidth: '90vw', maxHeight: '85vh' }"
    >
        <template #title>
            <div class="title" :class="{ victory: view?.iWon }">
                <Icon v-if="view?.iWon" :icon="crown" height="24" class="crown" />
                <span>{{ title }}</span>
            </div>
        </template>
        <div v-if="view" :key="entry?.id" class="body" :class="{ revealing: reveal }">
            <component :is="layouts[layout]" :view="view" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, watch, type Component } from "vue";
import { Icon } from "@iconify/vue";
import crown from "@iconify-icons/mdi/crown";
import Modal from "@renderer/components/common/Modal.vue";
import BattleResultsTwoColumn from "@renderer/components/battle/results/layouts/BattleResultsTwoColumn.vue";
import BattleResultsThreeColumn from "@renderer/components/battle/results/layouts/BattleResultsThreeColumn.vue";
import BattleResultsList from "@renderer/components/battle/results/layouts/BattleResultsList.vue";
import type { BattleResultsLayout } from "@renderer/model/battleResults";
import { buildBattleResultsView, onBattleResultsReveal, pickLayout, useBattleResults } from "@renderer/composables/useBattleResults";
import { useTypedI18n } from "@renderer/i18n";
import { me } from "@renderer/store/me.store";
import { subsManager } from "@renderer/store/users.store";

// Each layout only takes the view, so another one can be dropped in here and picked in pickLayout.
const layouts: Record<BattleResultsLayout, Component> = {
    twoColumn: BattleResultsTwoColumn,
    threeColumn: BattleResultsThreeColumn,
    list: BattleResultsList,
};

const { t } = useTypedI18n();
const { isOpen, entry, reveal, close } = useBattleResults();

const modalOpen = computed({
    get: () => isOpen.value,
    set: (open: boolean) => {
        if (!open) close();
    },
});

const view = computed(() => (entry.value ? buildBattleResultsView(entry.value.data, me.userId) : undefined));
const layout = computed<BattleResultsLayout>(() => (view.value ? pickLayout(view.value) : "list"));

const title = computed(() => {
    if (!view.value) return "";
    if (view.value.iWon) return t("lobby.components.battle.battleResults.victory");
    if (view.value.isDraw) return t("lobby.components.battle.battleResults.draw");
    if (view.value.myAllyTeamId !== undefined) return t("lobby.components.battle.battleResults.defeat");
    return t("lobby.components.battle.battleResults.battleEnded");
});

// Whoever took part may be nobody we have heard of, so subscribe while the results are up to get
// their flags and whether they are online for the menus.
const subscriptionSymbol = Symbol("BattleResultsModal");
watch(
    [isOpen, entry],
    ([open, current]) => {
        subsManager.clearAllFromList(subscriptionSymbol);
        if (!open || !current) return;

        const userIds = [...current.data.players, ...current.data.spectators]
            .map((participant) => participant.userId)
            .filter((id) => id !== me.userId);
        if (userIds.length) subsManager.attach(userIds, subscriptionSymbol);

        if (reveal.value) onBattleResultsReveal.dispatch(current);
    },
    { immediate: true }
);
</script>

<style lang="scss" scoped>
.title {
    display: flex;
    align-items: center;
    gap: 8px;
    &.victory {
        color: gold;
    }
}
.body {
    min-width: 0;
}

// Placeholder reveal: the results fade up, then each ally team follows in turn. Only runs when the
// modal was opened by the battle/ended event, not when reopened from the history.
.revealing {
    animation: results-reveal 0.4s ease-out both;
    :deep(.reveal-item) {
        animation: results-item-reveal 0.35s ease-out both;
        animation-delay: calc(0.3s + var(--reveal-index, 0) * 0.15s);
    }
}
@keyframes results-reveal {
    from {
        opacity: 0;
        transform: scale(0.96);
    }
    to {
        opacity: 1;
        transform: none;
    }
}
@keyframes results-item-reveal {
    from {
        opacity: 0;
        transform: translateY(12px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}
</style>

<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal v-model="modalOpen" :style="{ width: layout.width, maxWidth: '90vw', maxHeight: '85vh' }">
        <template #title>
            <div class="title" :class="{ victory: view?.iWon }">
                <Icon v-if="view?.iWon" :icon="crown" height="24" class="crown" />
                <span>{{ title }}</span>
            </div>
        </template>
        <div v-if="view" :key="entry?.id" class="body" :class="{ revealing: reveal }">
            <component :is="layout.component" v-bind="layout.props" :view="view" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, type Component } from "vue";
import { Icon } from "@iconify/vue";
import crown from "@iconify-icons/mdi/crown";
import Modal from "@renderer/components/common/Modal.vue";
import BattleResultsColumns from "@renderer/components/battle/results/layouts/BattleResultsColumns.vue";
import BattleResultsList from "@renderer/components/battle/results/layouts/BattleResultsList.vue";
import type { BattleResultsLayout } from "@renderer/model/battleResults";
import { battleResultTitleKey, buildBattleResultsView, pickLayout, useBattleResults } from "@renderer/composables/useBattleResults";
import { useTypedI18n } from "@renderer/i18n";
import { me } from "@renderer/store/me.store";

const layouts: Record<BattleResultsLayout, { component: Component; props?: Record<string, unknown>; width: string }> = {
    twoColumn: { component: BattleResultsColumns, props: { columns: 2 }, width: "800px" },
    threeColumn: { component: BattleResultsColumns, props: { columns: 3 }, width: "1100px" },
    list: { component: BattleResultsList, width: "600px" },
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
const layout = computed(() => layouts[view.value ? pickLayout(view.value) : "list"]);
const title = computed(() => (view.value ? t(battleResultTitleKey(view.value)) : ""));
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
    min-height: 0;
    overflow-y: auto;
}

// Placeholder reveal, only when opened by battle/ended.
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

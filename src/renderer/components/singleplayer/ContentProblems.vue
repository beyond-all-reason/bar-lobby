<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- What the content loader found wrong, for developers working on content. -->
<template>
    <details v-if="problems.length > 0" class="content-problems" @toggle="open = ($event.target as HTMLDetailsElement).open">
        <summary>
            <Icon :icon="open ? chevronDown : chevronRight" height="20" />
            <span>{{ t("lobby.singleplayer.content.problems", { count: problems.length }) }}</span>
        </summary>
        <ul>
            <li v-for="(problem, index) in problems" :key="index">
                <code>{{ problem.severity }}: {{ problem.path }}: {{ problem.message }}</code>
            </li>
        </ul>
    </details>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import chevronDown from "@iconify-icons/mdi/chevron-down";
import chevronRight from "@iconify-icons/mdi/chevron-right";
import { useTypedI18n } from "@renderer/i18n";
import type { ContentProblem } from "@shared/content/singleplayer";

const { t } = useTypedI18n();

defineProps<{
    problems: readonly ContentProblem[];
}>();

const open = ref(false);
</script>

<style lang="scss" scoped>
// The chevron replaces the browser's own disclosure marker.
summary {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    list-style: none;
    &::-webkit-details-marker {
        display: none;
    }
}
</style>

<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- What the content loader found wrong, for developers working on content. -->
<template>
    <details v-if="problems.length > 0" class="content-problems">
        <summary>{{ t("lobby.singleplayer.content.problems", { count: problems.length }) }}</summary>
        <ul>
            <li v-for="(problem, index) in problems" :key="index">
                <code>{{ problem.severity }}: {{ problem.path }}: {{ problem.message }}</code>
            </li>
        </ul>
    </details>
</template>

<script lang="ts" setup>
import { useTypedI18n } from "@renderer/i18n";
import type { ContentProblem } from "@shared/content/singleplayer";

const { t } = useTypedI18n();

defineProps<{
    problems: readonly ContentProblem[];
}>();
</script>

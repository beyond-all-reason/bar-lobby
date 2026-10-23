<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- A campaign's credits.json, one entry per line. A stub until the credits format is settled. -->
<template>
    <div class="flex-col gap-sm">
        <div v-for="(entry, index) in credits" :key="index">{{ entry }}</div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    credits: readonly string[];
}>();
</script>

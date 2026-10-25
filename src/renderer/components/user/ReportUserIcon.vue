<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <i :class="reportUserIconClass" />
</template>

<script lang="ts" setup>
import { reportUserIconClass } from "@renderer/composables/useReportUser";
</script>

<style lang="scss">
.report-user-icon {
    color: rgb(243, 213, 79);
}
</style>

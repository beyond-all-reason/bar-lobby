<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Panel>
        <slot name="header" />
        <div class="main-content">
            <div class="flex-row">
                <div class="player-list">
                    <slot name="player-list" />
                </div>
            </div>
            <main>
                <slot name="main" />
            </main>
        </div>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
</script>

<style scoped lang="scss">
.map-preview {
    width: 50%;
    max-height: 200px;
}
.main-content {
    display: flex;
    flex-direction: row;
    gap: 10px;
    height: 100%;
}
.player-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    height: 100%;
}
</style>

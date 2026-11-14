<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div>
        <span class="rejoin-label">{{ "Rejoin" }}</span>
        <video :src="video" autoplay muted loop></video>
    </div>
</template>

<script lang="ts" setup>
import { miscVideos } from "@renderer/assets/assetFiles";

const video = miscVideos["./videos/misc/active_battle.mkv"];
</script>

<style lang="scss" scoped>
:deep(> div) {
    width: 100%;
}

video {
    display: block;
    width: 100%;
    height: auto;
}

.rejoin-label {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
}
</style>

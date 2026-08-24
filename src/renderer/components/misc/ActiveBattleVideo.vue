<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <video :src="video" autoplay muted loop></video>
</template>

<script lang="ts" setup>
import { miscVideos } from "@renderer/assets/assetFiles";

const video = miscVideos["./videos/misc/active_battle.mkv"];
</script>

<style lang="scss" scoped>
video {
    max-width: 100%;
    max-height: 200px;
    height: auto;
    object-fit: fill;
}
</style>

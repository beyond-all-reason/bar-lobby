<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullwidth">
        <div class="progress-bar-outer margin-left-md margin-right-md">
            <MapDownloadProgress :map-name="map?.springName" :height="75"></MapDownloadProgress>
        </div>
        <button
            v-if="map.isInstalled"
            class="quick-play-button fullwidth"
            :class="props.class"
            :disabled="props.disabled"
            @click="props.onClick"
        >
            <slot />
        </button>
        <Button v-else-if="map.isDownloading" class="grey quick-download-button fullwidth anchor" @input.stop>Downloading...</Button>
        <Button v-else class="red fullwidth quick-download-button" @click="downloadMap(map.springName)">Download map</Button>
    </div>
</template>

<script lang="ts" setup>
import { MapDownloadData } from "@main/content/maps/map-data";
import Button from "@renderer/components/controls/Button.vue";
import { downloadMap } from "@renderer/store/maps.store";
import { ButtonProps } from "primevue/button";
import MapDownloadProgress from "@renderer/components/common/MapDownloadProgress.vue";

export interface Props extends /* @vue-ignore */ ButtonProps {
    map: MapDownloadData;
    disabled?: boolean;
    class?: string;
    onClick?: (event: MouseEvent) => void;
}

const props = defineProps<Props>();
</script>

<style lang="scss" scoped>
.quick-download-button {
    align-self: center;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.4rem;
    padding: 10px 40px;
    color: #fff;
    border: none;
    border-radius: 2px;
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.quick-play-button {
    align-self: center;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.4rem;
    padding: 10px 40px;
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.quick-play-button:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}

.quick-play-button::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%) scale(0);
    border-radius: 50%;
    transition: transform 0.4s ease;
}

.quick-play-button:hover::before {
    box-shadow: 0 8px 15px rgba(34, 197, 94, 0.4);
}
.anchor {
    anchor-name: --anchor;
}
.progress-bar-outer {
    position: fixed;
    position-area: top span-all;
    position-anchor: --anchor;
    width: anchor-size(width);
	height: anchor-size(height);
    transform: translateY(100%);
	overflow:hidden;
}
</style>

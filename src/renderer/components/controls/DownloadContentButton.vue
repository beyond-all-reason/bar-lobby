<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullwidth">
        <div class="progress-bar-outer margin-left-md margin-right-md">
            <DownloadProgress :map-name="map?.springName" :engine="engineVersion" :game="gameVersion" :height="75"></DownloadProgress>
        </div>
        <button v-if="ready" class="quick-play-button fullwidth" :class="props.class" :disabled="props.disabled" @click="props.onClick">
            <slot />
        </button>
        <Button v-else-if="isDownloading" class="grey quick-download-button fullwidth anchor" @input.stop style="min-height: unset">{{
            t("lobby.components.controls.downloadContentButton.downloading")
        }}</Button>
        <Button
            v-else
            class="red quick-download-button fullwidth"
            @click="beginDownload(map?.springName, engineVersion, gameVersion)"
            style="min-height: unset"
            >{{ t("lobby.components.controls.downloadContentButton.download") }}</Button
        >
    </div>
</template>

<script lang="ts" setup>
import { computed, triggerRef } from "vue";
import { MapDownloadData } from "@main/content/maps/map-data";
import Button from "@renderer/components/controls/Button.vue";
import { downloadMap } from "@renderer/store/maps.store";
import { ButtonProps } from "primevue/button";
import DownloadProgress from "@renderer/components/common/DownloadProgress.vue";
import { useTypedI18n } from "@renderer/i18n";
import { downloadEngine } from "@renderer/store/engine.store";
import { downloadGame } from "@renderer/store/game.store";
import { computedAsync } from "@vueuse/core";
import { downloadsStore } from "@renderer/store/downloads.store";
const { t } = useTypedI18n();

export interface Props extends /* @vue-ignore */ ButtonProps {
    map?: MapDownloadData;
    disabled?: boolean;
    class?: string;
    onClick?: (event: MouseEvent) => void;
    engineVersion?: string;
    gameVersion?: string;
}
const props = defineProps<Props>();

//FIXME: After a download, these don't automatically update to show that we have the content. Maps work, but not these two.
//Vue doesn't seem to be able to see changes in the return from isVersionInstalled.
//Nor is there a way to just trigger it to recompute? Need to research.
const engineInstalled = computedAsync(async () => {
    // if (props.engineVersion == undefined) {
    //     return true;
    // } else
    return await window.engine.isVersionInstalled(props.engineVersion!);
}, false);
const gameInstalled = computedAsync(async () => {
    // if (props.gameVersion == undefined) {
    //     return true;
    // } else
    return window.game.isVersionInstalled(props.gameVersion!);
}, false);

window.downloads.onDownloadGameComplete(() => {});
window.downloads.onDownloadEngineComplete(() => {});

const ready = computed(() => {
    const bools = {
        map: false,
        engine: false,
        game: false,
    };
    if (props.map != undefined) {
        if (props.map.isInstalled) {
            bools.map = true;
        }
    } else {
        bools.map = true;
    }
    if (props.engineVersion != undefined) {
        bools.engine = engineInstalled.value;
    } else {
        bools.engine = true;
    }
    if (props.gameVersion != undefined) {
        bools.game = gameInstalled.value;
    } else {
        bools.game = true;
    }
    console.log("computed booleans:", bools);
    return bools.engine && bools.game && bools.map;
});

const isMapDownloading = computed(() => {
    if (props.map?.springName == undefined) {
        return false;
    }
    const downloads = downloadsStore.mapDownloads;
    for (const download of downloads) {
        if (download.name === props.map.springName) {
            return true;
        }
    }
    return false;
});
const isEngineDownloading = computed(() => {
    if (props.engineVersion == undefined) {
        return false;
    }
    const downloads = downloadsStore.engineDownloads;
    for (const download of downloads) {
        if (download.name === props.engineVersion) {
            return true;
        }
    }
    return false;
});
const isGameDownloading = computed(() => {
    if (props.gameVersion == undefined) {
        return false;
    }
    const downloads = downloadsStore.gameDownloads;
    for (const download of downloads) {
        if (download.name === props.gameVersion) {
            return true;
        }
    }
    return false;
});

const isDownloading = computed(() => {
    return isMapDownloading.value || isEngineDownloading.value || isGameDownloading.value;
});

// Note; we have to await each download because pr-downloader will crash if we do two/three at once.
async function beginDownload(map?: string, engine?: string, game?: string) {
    if (map && !props.map?.isInstalled) {
        await downloadMap(map);
    }
    if (engine && !(await window.engine.isVersionInstalled(engine))) {
        await downloadEngine(engine);
    }
    if (game && !(await window.game.isVersionInstalled(game))) {
        await downloadGame(game);
    }
}
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
    overflow: hidden;
}
</style>

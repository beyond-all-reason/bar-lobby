<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullwidth">
        <div class="progress-bar-outer margin-left-md margin-right-md">
            <DownloadProgress
                :maps="maps"
                :engines="engines"
                :games="games"
                :height="75"
                @status-change="updateDownloadStatus"
            ></DownloadProgress>
        </div>
        <button
            v-if="ready"
            class="quick-play-button fullwidth"
            :class="$props.class != undefined ? $props.class : ''"
            :disabled="disabled"
            @click="onClick"
        >
            <slot />
        </button>
        <Button v-else-if="isDownloading" class="grey quick-download-button fullwidth anchor" @input.stop style="min-height: unset">{{
            t("lobby.components.controls.downloadContentButton.downloading")
        }}</Button>
        <Button v-else class="red quick-download-button fullwidth" @click="beginDownload(maps, engines, games)" style="min-height: unset">{{
            t("lobby.components.controls.downloadContentButton.download")
        }}</Button>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import Button from "@renderer/components/controls/Button.vue";
import { downloadMap } from "@renderer/store/maps.store";
import { ButtonProps } from "primevue/button";
import DownloadProgress from "@renderer/components/common/DownloadProgress.vue";
import { useTypedI18n } from "@renderer/i18n";
import { downloadEngine } from "@renderer/store/engine.store";
import { downloadGame } from "@renderer/store/game.store";
import { enginesStore } from "@renderer/store/engine.store";
import { mapsStore } from "@renderer/store/maps.store";
import { gameStore } from "@renderer/store/game.store";

const { t } = useTypedI18n();

export interface Props extends /* @vue-ignore */ ButtonProps {
    disabled?: boolean;
    class?: string;
    onClick?: (event: MouseEvent) => void;
    maps?: string[];
    engines?: string[];
    games?: string[];
}
const { maps = [], engines = [], games = [] } = defineProps<Props>();

const isDownloading = ref(false);

const ready = computed(() => {
    const targetList = new Set([...maps, ...games, ...engines]);
    console.log("[DEBUG] Download button ready check:", {
        targetMaps: maps,
        targetGames: games,
        targetEngines: engines,
        targetList: [...targetList],
        availableMaps: [...mapsStore.availableMapNames],
        availableEngines: enginesStore.availableEngineVersions.map((e) => e.id),
        availableGames: [...gameStore.availableGameVersions.keys()],
    });

    if (targetList.size == 0) return true;

    // Check each map individually for better debugging
    for (const mapName of maps ?? []) {
        const isAvailable = mapsStore.availableMapNames.has(mapName);
        console.log(`[DEBUG] Map ${mapName}: available=${isAvailable}`);
        if (!isAvailable) return false;
    }

    let availableContent = new Set(mapsStore.availableMapNames);
    availableContent = availableContent.union(new Set(enginesStore.availableEngineVersions.map((e) => e.id)));
    availableContent = availableContent.union(new Set(gameStore.availableGameVersions.keys()));

    const missing = targetList.difference(availableContent);
    console.log(`[DEBUG] Missing content:`, [...missing]);

    if (missing.size > 0) return false;
    else return true;
});

function updateDownloadStatus(value: boolean) {
    isDownloading.value = value;
}

// Note; we have to await each download because we need to update pr-downloader to accept concurrent downloads
async function beginDownload(maps?: string[], engines?: string[], games?: string[]) {
    for (const map of maps ?? []) {
        await downloadMap(map);
    }
    for (const engine of engines ?? []) {
        await downloadEngine(engine);
    }
    for (const game of games ?? []) {
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

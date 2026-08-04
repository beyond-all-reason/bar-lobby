<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullwidth anchor">
        <div class="progress-bar-outer">
            <DownloadProgress :maps="maps" :engines="engines" :games="games" :height="600"></DownloadProgress>
        </div>
        <Button
            v-if="isDownloading"
            class="grey quick-download-button fullwidth"
            :class="$props.class != undefined ? $props.class : ''"
            @input.stop
            style="min-height: unset"
            >{{ t("lobby.components.controls.downloadContentButton.downloading") }}</Button
        >
        <button
            v-else-if="ready"
            class="quick-play-button fullwidth"
            :class="$props.class != undefined ? $props.class : ''"
            :disabled="disabled"
            @click="onClick"
        >
            <slot />
        </button>
        <Button
            v-else
            class="red quick-download-button fullwidth"
            :class="$props.class != undefined ? $props.class : ''"
            :disabled="contentsStore.isPathChanging"
            @click="beginDownload"
            style="min-height: unset"
            >{{ t("lobby.components.controls.downloadContentButton.download") }}</Button
        >
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import Button from "@renderer/components/controls/Button.vue";
import { ButtonProps } from "primevue/button";
import DownloadProgress from "@renderer/components/common/DownloadProgress.vue";
import { useTypedI18n } from "@renderer/i18n";
import { contentRefs, contentsStore, ensureContent, inFlightFor } from "@renderer/store/contents.store";

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

const emit = defineEmits(["downloads-started", "downloads-complete"]);

const refs = computed(() => contentRefs({ maps, engines, games }));

// Starts out assuming everything is missing so the button never offers to play content that has not
// been checked yet.
const missing = ref(refs.value);

watch(
    [refs, () => contentsStore.revision],
    async () => {
        missing.value = await window.content.missing(refs.value);
    },
    { immediate: true }
);

const ready = computed(() => missing.value.length === 0);

const isDownloading = computed(() => inFlightFor(refs.value).some((state) => state.status === "queued" || state.status === "acquiring"));

async function beginDownload() {
    emit("downloads-started");
    try {
        await ensureContent(refs.value);
    } finally {
        emit("downloads-complete");
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

.large {
    align-self: center;
    //width: 500px;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 2rem;
    padding: 20px 40px;
    text-align: center;
}
</style>

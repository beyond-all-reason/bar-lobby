<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Script Launcher", order: 5 } }
</route>

<template>
    <div class="flex-col gap-md fullheight">
        <Textarea class="fullheight" v-model="script" spellcheck="false" />
        <Button class="green" @click="launch">Launch</Button>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { configStore } from "@renderer/store/config.store";
import { gameStore, launchScript } from "@renderer/store/game.store";
import { enginesStore } from "@renderer/store/engine.store";
import { mapsStore } from "@renderer/store/maps.store";
import Button from "@renderer/components/controls/Button.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";

// Launch with the installed build rather than a rapid tag such as byar:test, which may not be installed and
// which the Steam edition cannot download.
const gameVersion = computed(() => gameStore.selectedGameVersion?.gameVersion);

// An install may not have the configured default maps, and may not be able to download them.
const mapName = computed(
    () =>
        configStore.defaultMaps.find((map) => mapsStore.availableMapNames.has(map)) ??
        mapsStore.availableMapNames.values().next().value ??
        configStore.defaultMaps[0]
);

const defaults = computed(() => ({ gametype: gameVersion.value, mapname: mapName.value }));

function defaultScript({ gametype, mapname }: { gametype: string | undefined; mapname: string | undefined }) {
    return `[game] {
    [ais] {
    }
    [allyteam0] {
        numallies=0;
    }
    [team0] {
        teamleader=0;
        allyteam=0;
    }
    [player0] {
        team=0;
        name=player;
    }
    mapname=${mapname ?? ""};
    myplayername=player;
    ishost=1;
    gametype=${gametype ?? ""};
}`;
}

const script = ref(defaultScript(defaults.value));

// Keep the default script on the selected version and map until it is edited.
watch(defaults, (newDefaults, oldDefaults) => {
    if (script.value === defaultScript(oldDefaults)) {
        script.value = defaultScript(newDefaults);
    }
});

async function launch() {
    const launchGameVersion = gameVersion.value;
    if (!launchGameVersion) {
        throw new Error("No game version selected");
    }
    if (!enginesStore.selectedEngineVersion) {
        throw new Error("No engine version selected");
    }
    await launchScript(script.value, launchGameVersion, enginesStore.selectedEngineVersion.id);
}
</script>

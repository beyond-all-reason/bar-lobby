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
import { gameStore } from "@renderer/store/game.store";
import { enginesStore } from "@renderer/store/engine.store";
import Button from "@renderer/components/controls/Button.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";

// Launch with the installed build rather than a rapid tag such as byar:test, which may not be installed and
// which the Steam edition cannot download.
const gameVersion = computed(() => gameStore.selectedGameVersion?.gameVersion);

function defaultScript(gametype: string | undefined) {
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
    mapname=${configStore.defaultMaps[0]};
    myplayername=player;
    ishost=1;
    gametype=${gametype ?? ""};
}`;
}

const script = ref(defaultScript(gameVersion.value));

// Keep the default script on the selected version until it is edited.
watch(gameVersion, (newVersion, oldVersion) => {
    if (script.value === defaultScript(oldVersion)) {
        script.value = defaultScript(newVersion);
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
    await window.game.launchScript(script.value, launchGameVersion, enginesStore.selectedEngineVersion.id);
}
</script>

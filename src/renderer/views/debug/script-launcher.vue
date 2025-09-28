<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Script Launcher", order: 5 } }
</route>

<template>
    <div class="flex-col gap-md fullheight">
        <div class="flex-row gap-md">
            <div class="flex-col flex-grow">
                <h3>Script Editor</h3>
                <Textarea class="script-editor" v-model="script" spellcheck="false" />
            </div>
            <div class="mod-panel">
                <ModSelector
                    :mod-selection="modSelection"
                    title="Mods"
                    variant="compact"
                    selection-mode="checkbox"
                    :show-installation="true"
                    :show-selected-summary="true"
                />
            </div>
        </div>
        <Button class="green" @click="launch">Launch</Button>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import ModSelector from "@renderer/components/mods/ModSelector.vue";
import { useModSelection } from "@renderer/composables/useModSelection";
import { useModIntegration } from "@renderer/composables/useModIntegration";
import { DEFAULT_ENGINE_VERSION, LATEST_GAME_VERSION } from "@main/config/default-versions";

const script = ref(`[game] {
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
    mapname=Red Comet Remake 1.8;
    myplayername=player;
    ishost=1;
    gametype=${LATEST_GAME_VERSION};
}`);

// Initialize mod selection and integration
const modSelection = useModSelection();
const modIntegration = useModIntegration({ selectedMods: modSelection.selectedMods });

async function launch() {
    // Get mod paths and integrate with script
    const modPaths = modIntegration.modPaths.value;
    const scriptWithMods = modIntegration.injectModsIntoScript(script.value);

    window.game.launchScript(scriptWithMods, LATEST_GAME_VERSION, DEFAULT_ENGINE_VERSION, modPaths);
}
</script>

<style lang="scss" scoped>
.script-editor {
    height: 400px;
    font-family: "Courier New", monospace;
    font-size: 0.875rem;
}

.mod-panel {
    min-width: 300px;
    max-width: 400px;
}

h3 {
    margin: 0 0 0.5rem 0;
    color: #ffffff;
    font-size: 1.1rem;
    font-weight: 600;
}
</style>

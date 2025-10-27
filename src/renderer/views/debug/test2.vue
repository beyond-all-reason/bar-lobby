<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="view">
        <Panel>
            <div>
                <Button @click="go">Go</Button>
            </div>
            <div class="flex-column margin-left-lg margin-right-md">
                <div class="flex-row">
                    <Textbox v-model="mapName" />
                    <Button @click="mapName = undefined">Clear Map Name</Button>
                </div>
                <div class="flex-row">
                    <Textbox v-model="engineVersion" />
                    <Button @click="engineVersion = undefined">Clear Engine Version</Button>
                </div>
                <div class="flex-row">
                    <Textbox v-model="gameVersion" />
                    <Button @click="gameVersion = undefined">Clear Game Version</Button>
                </div>
                <div>
                    <DownloadContentButton
                        class="green fullwidth"
                        @click="play"
                        :engine-version="engineVersion"
                        :game-version="gameVersion"
                        :map="map"
                        >I do nothing now!</DownloadContentButton
                    >
                </div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Button from "@renderer/components/controls/Button.vue";
import Password from "@renderer/components/prompts/Password.vue";
import { usePrompt } from "@renderer/composables/usePrompt";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import Panel from "@renderer/components/common/Panel.vue";

const { prompt } = usePrompt();
const mapName = ref<string | undefined>(undefined);
const engineVersion = ref<string | undefined>(undefined);
const gameVersion = ref<string | undefined>(undefined);

const map = useDexieLiveQueryWithDeps([() => mapName.value], () => {
    if (mapName.value == undefined) return undefined;
    return db.maps.get(mapName.value);
});

function play() {
    console.log("clicked play");
}

async function go() {
    const data = await prompt({
        component: Password,
        title: "Battle Password",
    });
    console.log(data);
}
</script>

<style lang="scss" scoped></style>

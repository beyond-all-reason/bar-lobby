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
import { ref } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import { LATEST_GAME_VERSION } from "@main/config/default-versions";

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

function launch() {
    window.game.launchScript(script.value);
}
</script>

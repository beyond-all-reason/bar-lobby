<route lang="json5">
{ meta: { title: "Script Launcher", order: 5 } }
</route>

<template>
    <div class="flex-col gap-md fullheight">
        <Textarea v-model="script" spellcheck="false" />
        <Button class="green" @click="launch">Launch</Button>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Button from "@/components/controls/Button.vue";
import Textarea from "@/components/controls/Textarea.vue";
import { defaultGameVersion } from "@/config/default-versions";

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
    gametype=${defaultGameVersion};
}`);

function launch() {
    api.game.launch(script.value);
}
</script>

<style lang="scss" scoped>
.textarea {
    height: 100%;
}
</style>

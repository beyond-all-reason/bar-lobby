<route lang="json5">
{ meta: { title: "Test", order: 2 } }
</route>

<template>
    <div>
        <!-- <BattlePassword></BattlePassword> -->
        <Button @click="go">Go</Button>
        <PasswordPrompt v-slot="{ resolve, reject }">
            <!-- <Dialog v-model:visible="visible" modal header="Header" :style="{ width: '50vw' }"> -->
            <div class="dialog">
                <Textbox v-model="thing" label="yep" />
                <Button @click="resolve(thing)">Ok</Button>
                <Button @click="reject">Cancel</Button>
            </div>
            <!-- </Dialog> -->
        </PasswordPrompt>
    </div>
</template>

<script lang="ts" setup>
// import BattlePassword from "@renderer/components/battle/BattlePassword.vue";

import { createTemplatePromise } from "@vueuse/core";
import { ref } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";

const thing = ref("");

const PasswordPrompt = createTemplatePromise<string>({
    transition: {
        name: "fade",
        appear: true,
    },
});

async function go() {
    try {
        const stuff = await PasswordPrompt.start();
        console.log(stuff);
    } catch (err) {
        console.error("Cancelled");
    }
}
</script>

<style lang="scss" scoped>
.dialog {
    position: fixed;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
</style>

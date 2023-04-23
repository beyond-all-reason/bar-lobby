<template>
    <div>
        <Button @click="join">Join</Button>

        <PasswordPrompt v-slot="{ resolve, reject }">
            <Modal title="Battle Password" :modelValue="true" @close="reject">
                <form class="flex-col gap-md" @submit.prevent="resolve(password)" @keydown.enter.prevent="resolve(password)">
                    <Textbox v-model="password" label="Password" type="password" required />
                    <Button type="submit">OK</Button>
                </form>
            </Modal>
        </PasswordPrompt>
    </div>
</template>

<script lang="ts" setup>
import { createTemplatePromise } from "@vueuse/core";
import { ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import Textbox from "@/components/controls/Textbox.vue";

const PasswordPrompt = createTemplatePromise<string>({
    transition: {
        name: "modal",
    },
});

const password = ref("");

async function join() {
    const result = await PasswordPrompt.start();
    console.log(result);
}
</script>

<style lang="scss" scoped></style>

<template>
    <form ref="form" @submit.prevent="submit" @keydown.enter="submit">
        <div class="flex-col gap-md">
            <slot />
            <div class="flex-row gap-md flex-space-between">
                <Button class="flex-grow red" @click="cancel">Cancel</Button>
                <Button class="flex-grow green" type="submit">OK</Button>
            </div>
        </div>
    </form>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Button from "@/components/controls/Button.vue";

const form = ref<HTMLFormElement>();

function cancel() {
    api.prompt.promptRef.value?.close();
}

function submit() {
    api.prompt.promptRef.value?.submit();
}
</script>

<style lang="scss" scoped></style>

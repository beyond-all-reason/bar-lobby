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

import { promptRef } from "@/api/prompt";
import Button from "@/components/controls/Button.vue";

const form = ref<HTMLFormElement>();

function cancel() {
    promptRef.value?.close();
}

function submit() {
    promptRef.value?.submit();
}
</script>

<style lang="scss" scoped></style>

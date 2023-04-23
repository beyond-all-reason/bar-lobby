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
    // const data: Record<string, unknown> = {};

    // if (!form.value?.elements) {
    //     return;
    // }

    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // const fields = Array.from(form.value.elements) as any;
    // for (const field of fields) {
    //     if (field.name && field.value !== undefined) {
    //         data[field.name] = field.value;
    //     }
    // }

    api.prompt.promptRef.value?.submit();
}
</script>

<style lang="scss" scoped></style>

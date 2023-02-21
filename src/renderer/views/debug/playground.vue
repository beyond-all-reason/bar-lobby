<route lang="json5">
{ meta: { title: "Playground", order: 1 } }
</route>

<template>
    <div>
        <Button v-click-away:messages="() => {}" @click="stuff">Click</Button>
        {{ messagesOpen }}
    </div>
</template>

<script lang="ts" setup>
import { inject, Ref } from "vue";

import Button from "@/components/controls/Button.vue";

const messagesOpen = inject<Ref<boolean>>("messagesOpen")!;

function stuff() {
    messagesOpen.value = true;
}
</script>

<style lang="scss" scoped></style>

<template>
    <Control class="textarea">
        <Textarea v-bind="$attrs" />
    </Control>
</template>

<script lang="ts" setup>
// https://primevue.org/textarea

import Textarea from "primevue/textarea";

import Control from "@/components/controls/Control.vue";
</script>

<style lang="scss" scoped>
.textarea {
    textarea {
        width: 100%;
        max-width: 100%;
        padding: 5px;
    }
}
</style>

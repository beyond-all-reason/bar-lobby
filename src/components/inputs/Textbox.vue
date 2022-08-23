<template>
    <Control class="textbox">
        <InputText type="text" v-bind="$attrs" />
    </Control>
</template>

<script lang="ts" setup>
import InputText from "primevue/inputtext";

import Control from "@/components/inputs/Control.vue";
</script>

<style lang="scss" scoped>
.textbox {
    width: 100%;
    align-items: unset;
}
.p-inputtext {
    width: 100%;
    padding: 0 10px;
}
</style>

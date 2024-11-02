<template>
    <Prompt>
        <Textbox v-model="password" label="Password" type="password" />
    </Prompt>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Textbox from "@renderer/components/controls/Textbox.vue";
import Prompt from "@renderer/components/prompts/Prompt.vue";

const password = ref("");

defineExpose({
    returnValue: () => ({
        password: password.value,
    }),
});
</script>

<style lang="scss" scoped></style>

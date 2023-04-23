<template>
    <Prompt>
        <Textbox v-model="password" label="Password" type="password" required />
    </Prompt>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Textbox from "@/components/controls/Textbox.vue";
import Prompt from "@/components/prompts/Prompt.vue";

const password = ref("");

defineExpose({
    returnValue: () => ({
        password: password.value,
    }),
});
</script>

<style lang="scss" scoped></style>

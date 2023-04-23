<template>
    <div class="flex-col gap-md">
        <Textbox v-model="password" label="Password" type="password" required />
        <div class="flex-row gap-md flex-space-between">
            <Button class="flex-grow red" @click="emit('cancel')">Cancel</Button>
            <Button class="flex-grow green" @click="emit('confirm', { password })">OK</Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Button from "@/components/controls/Button.vue";
import Textbox from "@/components/controls/Textbox.vue";

const emit = defineEmits(["confirm", "cancel"]);

const password = ref("");
</script>

<style lang="scss" scoped></style>

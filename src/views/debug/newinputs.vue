<template>
    <div>
        <Textbox2 :value="text" @update:model-value="onUpdate" />
        {{ text }}
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Textbox2 from "@/components/inputs/Textbox2.vue";

const text = ref("hello");
const onUpdate = (newText: string) => {
    //text.value = newText;
    console.log(newText);
};
</script>

<style lang="scss" scoped></style>

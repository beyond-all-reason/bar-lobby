<template>
    <Control class="checkbox" @click="onClick">
        <Icon v-if="value" :icon="checkBold" height="22px" />
    </Control>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import { toRef } from "vue";

import Control from "@/components/inputs/Control.vue";

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
    }>(),
    {
        modelValue: false,
    }
);

const emits = defineEmits<{
    (event: "update:modelValue", checked: boolean): void;
}>();

const value = toRef(props, "modelValue");

const onClick = () => {
    emits("update:modelValue", !value.value);
};
</script>

<style lang="scss" scoped>
.checkbox {
    max-width: 35px;
    min-width: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>

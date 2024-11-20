<template>
    <Control class="checkbox">
        <div class="check-wrapper" @click="onClick">
            <Icon v-if="modelValue" :icon="checkBold" height="22px" />
        </div>
    </Control>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import { toRef } from "vue";

import Control from "@renderer/components/controls/Control.vue";

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

function onClick() {
    emits("update:modelValue", !value.value);
}
</script>

<style lang="scss" scoped>
.checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row-reverse;
    :deep(.label) {
        border-right: none;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
    }
}
.check-wrapper {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 33px;
    max-height: 33px;
    max-width: 33px;
    min-width: 33px;
}
</style>

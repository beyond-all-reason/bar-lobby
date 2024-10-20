<template>
    <Control class="checkbox">
        <div class="check-wrapper" @click="onClick">
            <Icon v-if="modelValue" :icon="checkBold" height="22px" />
            <Icon v-else-if="modelValue === false" :icon="closeThick" height="22px" />
        </div>
    </Control>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import closeThick from "@iconify-icons/mdi/close-thick";
import { toRef } from "vue";

import Control from "@renderer/components/controls/Control.vue";

const props = withDefaults(
    defineProps<{
        modelValue?: boolean | null;
    }>(),
    {
        modelValue: null,
    }
);

const emits = defineEmits<{
    (event: "update:modelValue", checked: boolean | null): void;
}>();

const value = toRef(props, "modelValue");

function onClick() {
    emits("update:modelValue", props.modelValue === true ? false : props.modelValue === false ? null : true);
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
    max-width: 33px;
    max-width: 33px;
    min-width: 33px;
}
</style>

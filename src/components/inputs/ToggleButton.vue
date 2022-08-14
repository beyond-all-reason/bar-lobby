<template>
    <Button :class="activeClasses" v-bind="$attrs" @click="onClick">
        <template v-if="modelValue">{{ onText }}</template>
        <template v-else>{{ offText }}</template>
    </Button>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Button from "@/components/inputs/Button.vue";

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        onText: string;
        offText: string;
        onClasses?: string[];
        offClasses?: string[];
    }>(),
    {
        onClasses: () => ["on"],
        offClasses: () => ["off"],
    }
);

const activeClasses = computed(() => (props.modelValue ? props.onClasses : props.offClasses));

const emits = defineEmits<{
    (event: "update:modelValue", on: boolean): void;
}>();

const onClick = () => {
    emits("update:modelValue", !props.modelValue);
};
</script>

<style lang="scss" scoped></style>

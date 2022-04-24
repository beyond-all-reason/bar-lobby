<template>
    <div class="control options" :class="{ disabled, fullWidth }">
        <div v-if="label" class="options__label">
            {{ label }}
        </div>
        <div class="options__list">
            <slot />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { provide, ref } from "vue";

const props = withDefaults(defineProps<{
    modelValue: unknown;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
}>(), {
    label: undefined,
    required: false,
    disabled: false,
    fullWidth: false
});

const emits = defineEmits<{
    (event: "update:modelValue", value: unknown): void
}>();

const selectedOption = ref(props.modelValue);

provide("selectedOption", selectedOption);

provide("toggleOption", (optionValue: unknown) => {
    if (Array.isArray(selectedOption.value)) {
        if (selectedOption.value.includes(optionValue)) {
            if (!props.required || (props.required && selectedOption.value.length > 1)) {
                selectedOption.value = selectedOption.value.filter(v => v !== optionValue);
            }
        } else {
            selectedOption.value.push(optionValue);
        }
    } else {
        if (!props.required && selectedOption.value === optionValue) {
            selectedOption.value = null;
        } else {
            selectedOption.value = optionValue;
        }
    }

    emits("update:modelValue", selectedOption.value);
});
</script>
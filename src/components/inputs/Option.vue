<template>
    <div class="options__option" :class="{ 'options__option--selected': isSelected }" @click="onClick">
        <slot />
    </div>
</template>

<script lang="ts" setup>
import { computed, inject, Ref } from "vue";

const props = defineProps<{
    value: unknown;
}>();

const toggleOption = inject("toggleOption") as (optionValue: unknown) => boolean;
const selectedOption = inject("selectedOption") as Ref<unknown>;
const isSelected = computed(() => {
    if (Array.isArray(selectedOption.value)) {
        return selectedOption.value.includes(props.value);
    } else {
        return selectedOption.value === props.value;
    }
});

const onClick = () => {
    toggleOption(props.value);
};
</script>
<template>
    <div class="option" :class="{ 'option--selected': isSelected }" @click="onClick" @mouseenter="sound">
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

const sound = () => {
    if (!isSelected.value) {
        api.audio.getSound("button-hover").play();
    }
};
</script>

<style lang="scss" scoped>
.option {
    position: relative;
    align-items: center;
    justify-content: center;
    padding: 3px 7px;
    color: rgba(255, 255, 255, 0.7);
    width: 100%;
    background: rgba(0, 0, 0, 0.15);
    &:hover:not(.option--selected) {
        background: rgba(255, 255, 255, 0.02);
        color: #ccc;
    }
    &:not(:last-child):after {
        position: absolute;
        content: "";
        right: -1px;
        top: 0;
        width: 1px;
        height: 100%;
        background: rgba(255, 255, 255, 0.1);
    }
    &--selected {
        background: rgba(255, 255, 255, 0.35);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
        color: #fff;
    }
}
</style>

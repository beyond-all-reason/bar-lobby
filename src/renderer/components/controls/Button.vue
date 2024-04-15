<template>
    <Control class="button" :class="[{ active }, $attrs.class]" :style="$attrs.style" :disabled="disabled" @click="onClick">
        <PrimeVueButton v-bind="$attrs">
            <template v-for="(_, name) in ($slots as {})" #[name]="slotData">
                <slot :name="name" v-bind="slotData || {}" />
            </template>
        </PrimeVueButton>
    </Control>
</template>

<script lang="ts">
export default {
    inheritAttrs: false,
};
</script>

<script lang="ts" setup>
// https://primevue.org/button

import PrimeVueButton, { ButtonProps } from "primevue/button";
import { computed } from "vue";

import Control from "@/components/controls/Control.vue";

export interface Props extends /* @vue-ignore */ ButtonProps {
    to?: string;
    disabled?: boolean;
}

const props = defineProps<Props>();

const active = computed(() => props?.to && api.router.currentRoute.value.path.includes(props.to));
async function onClick() {
    if (props.to && api.router.currentRoute.value.path !== props.to) {
        await api.router.push(props.to);
    }
}
</script>

<style lang="scss" scoped>
.button {
    padding: 0;
    align-self: unset;
    &.inline {
        align-self: flex-start;
    }
    &:not(.slim) {
        .p-button {
            min-height: 33px;
        }
    }
    &.slim {
        min-height: unset;
        align-self: center;
        border-radius: 2px;
        font-size: 14px;
        font-weight: 300;
    }
}
.p-button {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 8px;
}

$btnColors: (
    "blue": rgb(14, 109, 199),
    "red": rgb(165, 30, 30),
    "green": rgb(120, 189, 57),
    "yellow": rgb(243, 213, 79),
    "purple": rgb(199, 14, 199),
    "orange": rgb(199, 109, 14),
    "black": rgb(0, 0, 0),
    "white": rgb(255, 255, 255),
    "gray": rgb(128, 128, 128),
);

@each $colorKey, $color in $btnColors {
    .control.#{$colorKey} {
        background-color: rgba($color, 0.6);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 1px 1px 3px rgba(49, 47, 47, 0.1), inset 0 -17px 0 rgba(0, 0, 0, 0.05);
        &:hover {
            background-color: rgba($color, 0.8);
            box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1), inset 0 -17px 0 rgba(0, 0, 0, 0.05);
        }
    }
}
</style>

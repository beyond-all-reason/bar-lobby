<template>
    <Tooltip :content="tooltip">
        <div :class="{ control: !noStyle, button: !noStyle, disabled, 'flex-grow': flexGrow, slim, fullwidth: fullWidth }">
            <component :is="to ? 'router-link' : 'button'" :to="to" :class="{ btn: !noStyle, active: isActive }" v-bind="$attrs" @mouseenter="sound">
                <div class="content">
                    <slot />
                </div>
            </component>
        </div>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    inheritAttrs: false,
});
</script>

<script lang="ts" setup>
import { computed, toRefs, useAttrs } from "vue";
import { useRoute } from "vue-router";

import Tooltip from "@/components/common/Tooltip.vue";

const props = withDefaults(
    defineProps<{
        to?: string;
        tooltip?: string;
        disabled?: boolean;
        flexGrow?: boolean;
        slim?: boolean;
        fullWidth?: boolean;
        noStyle?: boolean;
    }>(),
    {
        to: undefined,
        tooltip: undefined,
        disabled: false,
        flexGrow: true,
        slim: false,
        fullWidth: false,
        noStyle: false,
    }
);

const attrs = useAttrs();
const route = useRoute();
const to = toRefs(props).to;
const isActive = computed(() => props.to && route.path.includes(props.to));
const sound = () => {
    if (!props.to || (props.to && !isActive.value)) {
        api.audio.getSound("button-hover").play();
    }
};
</script>

<style lang="scss" scoped>
.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

$btnColors: (
    "blue": rgb(14, 109, 199),
    "red": rgb(165, 30, 30),
    "green": rgb(120, 189, 57),
    "yellow": rgb(199, 199, 14),
    "purple": rgb(199, 14, 199),
    "orange": rgb(199, 109, 14),
    "black": rgb(0, 0, 0),
    "white": rgb(255, 255, 255),
    "gray": rgb(128, 128, 128),
);

button,
.btn,
.button {
    @each $colorKey, $color in $btnColors {
        &--#{$colorKey} {
            background-color: rgba($color, 0.6);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 1px 1px 3px rgba(49, 47, 47, 0.1), inset 0 -17px 0 rgba(0, 0, 0, 0.05);
            &:hover {
                background-color: rgba($color, 0.8);
                box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1), inset 0 -17px 0 rgba(0, 0, 0, 0.05);
            }
        }
    }

    font-weight: 500;

    &.slim .btn {
        padding: 1px 7px;
        min-height: unset;
        align-self: center;
        border-radius: 2px;
        font-size: 16px;
    }
}

button,
input[type="button"],
input[type="submit"],
.btn {
    width: unset;
    justify-content: center;
    flex-grow: 1;
    text-transform: uppercase;
}
</style>

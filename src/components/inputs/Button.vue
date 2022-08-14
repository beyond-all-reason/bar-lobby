<template>
    <Button v-bind="$attrs" :class="{ disabled, active }" @mouseenter="sound" @click="onClick">
        <template v-for="(_, slot) of $slots" #[slot]="scope">
            <slot :name="slot" v-bind="scope" />
        </template>
    </Button>
</template>

<script lang="ts">
import Button from "primevue/button";
import { defineComponent } from "vue";

export default defineComponent({
    inheritAttrs: false,
});
</script>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const props = withDefaults(
    defineProps<{
        to?: string;
        disabled?: boolean;
    }>(),
    {
        to: undefined,
        disabled: false,
    }
);

const route = useRoute();
const active = computed(() => props.to && route.path === props.to);
const onClick = () => {
    if (props.to && !active.value && !props.disabled) {
        api.router.push(props.to);
    }
};
const sound = () => {
    if (!props.to || (props.to && !active.value)) {
        api.audio.getSound("button-hover").play();
    }
};
</script>

<style lang="scss" scoped>
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

.p-button {
    flex-grow: unset;
    justify-content: center;
}

@each $colorKey, $color in $btnColors {
    .#{$colorKey} {
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

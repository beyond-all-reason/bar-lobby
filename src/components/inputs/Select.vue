<template>
    <div ref="controlEl" class="control select" :class="{ disabled, fullwidth: fullWidth }" @mouseenter="sound">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <VueNextSelect
            ref="vueSelect"
            :name="uuid"
            :modelValue="props.modelValue"
            :options="props.options"
            v-bind="$attrs"
            :hideSelected="true"
            :closeOnSelect="true"
            :openDirection="openDirection"
            :max-height="maxHeight"
            @focus="onFocus"
            @blur="onBlur"
            @click="onClick"
        />
    </div>
</template>

<script lang="ts">
export default {
    inheritAttrs: false,
};
</script>

<script lang="ts" setup>
// https://iendeavor.github.io/vue-next-select/api-reference.html

import { SetOptional } from "type-fest";
import { v4 as uuidv4 } from "uuid";
import { Ref, ref } from "vue";
import VueNextSelect from "vue-next-select";

type VueNextSelectProps = InstanceType<typeof VueNextSelect>["$props"];

interface Props extends SetOptional<VueNextSelectProps, "modelValue"> {
    label?: string;
    smallLabel?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
}

const props = defineProps<Props>();

const vueSelect: Ref<InstanceType<typeof VueNextSelect> | null> = ref(null);
const uuid = ref(uuidv4());
const label = ref(props.label);
const controlEl: Ref<HTMLElement | null> = ref(null);
const openDirection: Ref<"top" | "bottom" | undefined> = ref(undefined);
const maxHeight: Ref<number | undefined> = ref(undefined);
const isOpen = ref(false);
let timeoutInterval: number | undefined;

const sound = () => api.audio.getSound("button-hover").play();

const onFocus = () => {
    timeoutInterval = window.setTimeout(() => {
        isOpen.value = true;
    }, 300);

    if (controlEl.value && vueSelect.value) {
        const relativeParent = controlEl.value.offsetParent as HTMLElement | null;
        if (relativeParent) {
            const topOffset = controlEl.value.offsetTop;
            const bottomOffset = relativeParent.offsetHeight - controlEl.value.scrollHeight - controlEl.value.offsetTop;
            openDirection.value = topOffset > bottomOffset ? "top" : "bottom";
            if (getComputedStyle(relativeParent).overflow === "hidden") {
                maxHeight.value = Math.max(topOffset, bottomOffset);
            }
        }
    }
};

const onBlur = () => {
    if (timeoutInterval) {
        window.clearTimeout(timeoutInterval);
    }
    isOpen.value = false;
};

const onClick = () => {
    if (isOpen.value) {
        vueSelect.value?.blur();
    }
};
</script>

<style lang="scss">
.control.select {
    align-self: center;
    label {
        max-width: 60%;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .vue-select {
        position: unset;
        input,
        .vue-input {
            font-size: inherit;
            box-shadow: none;
            min-height: inherit;
            padding: 0;
            background-color: unset !important;
            border: none !important;
            margin-right: 5px;
            &::placeholder {
                color: #fff;
            }
        }
        &-header {
            flex-direction: row;
        }
        .vue-dropdown {
            z-index: 3;
            background-color: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(2px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            &-item {
                padding: 5px 10px;
                &:hover,
                &.highlighted,
                &.selected {
                    background-color: rgba(255, 255, 255, 0.9);
                    color: #000;
                    text-shadow: none;
                }
            }
        }
    }
}
</style>

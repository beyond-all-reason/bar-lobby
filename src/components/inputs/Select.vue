<template>
    <div ref="controlEl" class="control select" :class="{ disabled }" @mouseenter="sound">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <VueNextSelect
            ref="vueSelect"
            :name="uuid"
            :model-value="props.modelValue"
            :options="props.options"
            v-bind="$attrs"
            :hide-selected="true"
            :close-on-select="true"
            :open-direction="openDirection"
            :max-height="maxHeight"
            @focus="onFocus"
            @blur="onBlur"
            @click="onClick"
        />
    </div>
</template>

<script lang="ts" setup>
// https://iendeavor.github.io/vue-next-select/api-reference.html

import VueNextSelect from "vue-next-select";
import { Ref, ref } from "vue";
import { v4 as uuidv4 } from "uuid";

type VueNextSelectProps = InstanceType<typeof VueNextSelect>["$props"];

interface Props extends VueNextSelectProps {
    label?: string;
    smallLabel?: boolean;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    label: undefined,
    smallLabel: false,
    disabled: false
});

const emits = defineEmits<{
    (event: "change", value: any): void,
}>();

const vueSelect: Ref<InstanceType<typeof VueNextSelect> | null> = ref(null);
const uuid = ref(uuidv4());
const label = ref(props.label);
const controlEl: Ref<HTMLElement | null> = ref(null);
const openDirection: Ref<"top" | "bottom" | undefined> = ref(undefined);
const maxHeight: Ref<number | undefined> = ref(undefined);
const isOpen = ref(false);
let timeoutInterval: number | undefined;

const sound = () => window.api.audio.getSound("button-hover").play();

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


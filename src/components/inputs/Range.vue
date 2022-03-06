<template>
    <form class="control range" @submit.prevent="" @mouseenter="sound">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <div class="input">
            <VueSlider ref="slider" v-model="value" tooltip="none" :duration="0" :drag-on-click="true" v-bind="$attrs" @change="$emit('update:modelValue', value)" @error="error" />
        </div>
        <input :id="uuid" ref="textbox" v-model="value" :style="`width: ${max.toString().length + 1.85}ch`" :disabled="disableCustomInput">
    </form>
</template>

<script lang="ts" setup>
// https://nightcatsama.github.io/vue-slider-component/#/

import type { Ref} from "vue";
import { onMounted, ref, toRefs } from "vue";
import { v4 as uuidv4 } from "uuid";
import type { ERROR_TYPE } from "vue-slider-component";
import VueSlider from "vue-slider-component";

type VueSliderProps = InstanceType<typeof VueSlider>;

interface Props extends Omit<Partial<VueSliderProps>, "modelValue"> {
    modelValue: number | string,
    label?: string;
    disableCustomInput?: boolean;
    icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: 0,
    label: undefined,
    icon: undefined
});

const emits = defineEmits<{
    (event: "update:modelValue", value: number | string): void
}>();

const uuid = ref(uuidv4());
const { label, icon } = toRefs(props);
const value = ref(props.modelValue);
const slider = ref() as Ref<VueSlider>;
const textbox = ref();
const max = ref(0);
const disableCustomInput = ref(props.disableCustomInput);

onMounted(() => {
    if (typeof slider.value.max === "number") {
        max.value = slider.value.max;
    }
});

const error = (type: ERROR_TYPE, msg: string) => {
    const textboxEl = textbox.value as HTMLInputElement;
    textboxEl.setCustomValidity(msg);
    textboxEl.reportValidity();
};

const sound = () => window.api.audio.getSound("button-hover").play();
</script>
<template>
    <div class="control range" :class="{ 'trim-label': trimLabel, disabled }" @submit.prevent="">
        <label v-if="label" :for="uuid" :class="{ trim: trimLabel }">{{ label }}</label>
        <div class="input" @mouseenter="sound">
            <VueSlider ref="slider" v-model="value" tooltip="none" :duration="0" :drag-on-click="true" :contained="true" v-bind="$attrs" @error="(error as any)" @update:model-value="emit('update:modelValue', value)" />
        </div>
        <input :id="uuid" ref="textbox" v-model="value" :style="`width: calc(${max.toString().length}ch + 20px)`" :disabled="disableCustomInput">
    </div>
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
    modelValue?: number
    label?: string;
    disableCustomInput?: boolean;
    icon?: string;
    trimLabel?: boolean;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: 0,
    label: undefined,
    icon: undefined,
    disableCustomInput: false, // TODO: needs some improvement before enabling custom input by default
    trimLabel: false,
    disabled: false
});

const emit = defineEmits<{
    (event: "update:modelValue", value: number): void
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

const sound = () => api.audio.getSound("button-hover").play();
</script>
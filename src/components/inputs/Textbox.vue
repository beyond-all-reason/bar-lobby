<template>
    <div class="control textbox" :class="{ disabled }" @mouseenter="sound">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <input :id="uuid" ref="input" v-model="text" :name="name" :type="type" v-bind="$attrs" @input="onInput" @invalid="onInput">
        <label v-if="icon" :for="uuid"><Icon :for="uuid" :icon="icon" /></label>
    </div>
</template>

<script lang="ts" setup>
import type { Ref} from "vue";
import { ref, toRefs } from "vue";
import { v4 as uuidv4 } from "uuid";
import Icon from "@/components/common/Icon.vue";

const props = withDefaults(defineProps<{
    modelValue?: string;
    name?: string;
    type?: string;
    label?: string;
    icon?: string;
    validation?: (value: string) => string;
    disabled?: boolean;
}>(), {
    modelValue: "",
    name: undefined,
    type: undefined,
    label: undefined,
    icon: undefined,
    validation: undefined,
    disabled: false
});

const emit = defineEmits(["update:modelValue"]);

const uuid = ref(uuidv4());
const { label, type, icon, validation } = toRefs(props);
const text = ref(props.modelValue);
const input = ref() as Ref<HTMLInputElement>;
const name = props.name ? ref(props.name) : uuid;

const onInput = (event: Event) => {
    emit("update:modelValue", text.value);

    if (validation?.value && event.target instanceof HTMLInputElement) {
        const validate = validation.value(event.target.value);
        if (validate) {
            event.target.setCustomValidity(validate);
        } else {
            event.target.setCustomValidity("");
        }
    }
};

const sound = () => api.audio.getSound("button-hover").play();
</script>


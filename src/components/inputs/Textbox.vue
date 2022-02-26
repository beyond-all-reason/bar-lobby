<template>
    <div class="control textbox" @mouseenter="sound">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <input ref="input" :id="uuid" :name="name" :type="type" v-bind="$attrs" v-model="text" @input="onInput" @invalid="onInput">
        <label :for="uuid" v-if="icon"><Icon :for="uuid" :icon="icon" /></label>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref, toRefs } from "vue";
import { v4 as uuidv4 } from "uuid";
import Icon from "@/components/common/Icon.vue";

const props = defineProps({
    name: String,
    type: {
        type: String,
        default: "text"
    },
    label: String,
    modelValue: String,
    icon: String,
    validation: Function
});

const emit = defineEmits(["update:modelValue"]);

const uuid = ref(uuidv4());
const { label, type, icon, validation } = toRefs(props);
const text = ref(props.modelValue);
const input = ref() as Ref<HTMLInputElement>;
const name = props.name ? ref(props.name) : uuid;

const onInput = (event: InputEvent) => {
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

const sound = () => window.api.audio.getSound("button-hover").play();
</script>


<template>
    <div class="control textbox" :class="{ disabled }" @mouseenter="sound">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <input
            :id="uuid"
            ref="input"
            v-model="text"
            :name="name"
            :type="type"
            v-bind="$attrs"
            @input="onInput"
            @invalid="onInput"
            @keydown.prevent.enter="submit"
            @keydown.prevent.up="onUpArrow"
            @keydown.prevent.down="onDownArrow"
        >
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
    validation?: (value: string) => string | undefined;
    disabled?: boolean;
    enableSubmit?: boolean;
    enableHistory?: boolean;
}>(), {
    modelValue: "",
    name: undefined,
    type: undefined,
    label: undefined,
    icon: undefined,
    validation: undefined,
    disabled: false,
    enableSubmit: false,
    enableHistory: false
});

const emit = defineEmits<{
    (event: "update:modelValue", value: string): void;
    (event: "submit", value: string): void;
}>();

const uuid = ref(uuidv4());
const { label, type, icon, validation } = toRefs(props);
const text = ref(props.modelValue);
const input = ref() as Ref<HTMLInputElement>;
const name = props.name ? ref(props.name) : uuid;
const history: Ref<string[]> = ref([]);
const historyIndex = ref(0);

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

const submit = () => {
    if (props.enableSubmit) {
        emit("submit", text.value);

        if (props.enableHistory) {
            history.value.push(text.value);
            historyIndex.value = history.value.length;
        }

        text.value = "";
    }
};

const onUpArrow = () => {
    if (props.enableHistory) {
        if (historyIndex.value > 0) {
            historyIndex.value--;
            text.value = history.value[historyIndex.value];
        }
    }
};

const onDownArrow = () => {
    if (props.enableHistory) {
        if (historyIndex.value < history.value.length - 1) {
            historyIndex.value++;
            text.value = history.value[historyIndex.value];
        }
    }
};
</script>

<style lang="scss" scoped>

</style>


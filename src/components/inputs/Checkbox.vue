<template>
    <div class="control checkbox" :class="{ disabled }">
        <input :id="uuid" v-model="checked" type="checkbox" @change="$emit('update:modelValue', checked)">
        <label :for="uuid" :class="{ checked, hasLabel: Boolean(label) }" @mouseenter="sound">
            <div class="icon" :class="{ hasLabel: Boolean(label) }">
                <Icon class="check" icon="check-bold" />
            </div>
            <div v-if="label" class="label">{{ label }}</div>
        </label>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import Icon from "@/components/common/Icon.vue";

const props = withDefaults(defineProps<{
    modelValue?: boolean;
    type?: string;
    label?: string;
    smallLabel?: boolean;
    disabled?: boolean;
}>(), {
    modelValue: false,
    type: "text",
    label: undefined,
    smallLabel: false,
    disabled: false
});

const emits = defineEmits<{
    (event: "update:modelValue", checked: boolean): void,
    (event: "change", value: boolean): void,
}>();

const uuid = ref(uuidv4());
const label = ref(props.label);
const checked = ref(props.modelValue);

const sound = () => window.api.audio.getSound("button-hover").play();
</script>
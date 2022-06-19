<template>
    <div class="control checkbox" :class="{ disabled }">
        <input :id="uuid" :modelValue="modelValue" type="checkbox" @change="$emit('update:modelValue', !modelValue)" />
        <label :for="uuid" :class="{ checked: modelValue, hasLabel: Boolean(label) }" @mouseenter="sound">
            <div class="icon" :class="{ hasLabel: Boolean(label) }">
                <Icon class="check" :icon="checkBold" height="23" />
            </div>
            <div v-if="label" class="label">{{ label }}</div>
        </label>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import checkBold from "@iconify-icons/mdi/check-bold";
import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
        type?: string;
        label?: string;
        smallLabel?: boolean;
        disabled?: boolean;
    }>(),
    {
        modelValue: false,
        type: "text",
        label: undefined,
        smallLabel: false,
        disabled: false,
    }
);

const emits = defineEmits<{
    (event: "update:modelValue", checked: boolean): void;
}>();

const uuid = ref(uuidv4());
const label = ref(props.label);

const sound = () => api.audio.getSound("button-hover").play();
</script>

<style lang="scss" scoped>
.control.checkbox {
    .checkmark {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        padding: 0;
    }

    input[type="checkbox"] {
        display: none;
    }
    label {
        display: flex;
        position: relative;
        gap: 15px;
        align-self: center;
        &.hasLabel {
            padding-left: 5px !important;
        }
        &:not(.hasLabel) {
            padding-left: 5px;
            padding-right: 5px;
        }
    }
    .icon {
        display: flex;
        flex-direction: column;
        &.hasLabel:after {
            position: absolute;
            content: "";
            top: 0;
            left: 0;
            width: 35px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            height: 100%;
        }
    }
    .check {
        visibility: hidden;
    }
    .checked .check {
        visibility: visible;
    }
}
</style>

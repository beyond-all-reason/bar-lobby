<template>
    <div class="control checkbox">
        <input :id="uuid" type="checkbox" v-model="checked" @change="$emit('update:modelValue', checked)">
        <label :for="uuid" :class="{ checked, hasLabel: Boolean(label) }">
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

const props = defineProps({
    type: {
        type: String,
        default: "text"
    },
    label: {
        type: String,
        default: ""
    },
    modelValue: Boolean,
});

const uuid = ref(uuidv4());
const label = ref(props.label);
const checked = ref(props.modelValue);
</script>
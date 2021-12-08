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

<script lang="ts">
import { defineComponent, ref } from "vue";
import { v4 as uuidv4 } from "uuid";

export default defineComponent({
    props: {
        type: {
            type: String,
            default: "text"
        },
        label: {
            type: String,
            default: ""
        },
        modelValue: Boolean,
    },
    setup(props, context) {
        const uuid = ref(uuidv4());
        const label = ref(props.label);
        const checked = ref(props.modelValue);

        return { uuid, label, checked };
    }
});
</script>
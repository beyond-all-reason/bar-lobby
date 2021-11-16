<template>
    <div class="control">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <input :id="uuid" :type="type" v-bind="$attrs" v-model="text" @input="$emit('update:modelValue', text)">
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
        label: String,
        modelValue: String,
    },
    setup(props) {
        const uuid = ref(uuidv4());
        const label = ref(props.label);
        const type = ref(props.type);
        const text = ref(props.modelValue);

        return { uuid, type, label, text };
    }
});
</script>

<style scoped lang="scss">
</style>
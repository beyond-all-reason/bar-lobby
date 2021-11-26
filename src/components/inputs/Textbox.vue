<template>
    <div class="control">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <input ref="input" :id="uuid" :type="type" v-bind="$attrs" v-model="text" @input="onInput">
    </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from "vue";
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
    setup(props, context) {
        const uuid = ref(uuidv4());
        const label = ref(props.label);
        const type = ref(props.type);
        const text = ref(props.modelValue);
        const input = ref() as Ref<HTMLInputElement>;
        
        const onInput = () => {
            context.emit("update:modelValue", text.value);
            context.emit("validate", input.value.checkValidity());
        };

        return { uuid, type, label, text, input, onInput };
    }
});
</script>

<style scoped lang="scss">
</style>
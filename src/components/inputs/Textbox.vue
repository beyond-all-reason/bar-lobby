<template>
    <div class="control textbox">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <input ref="input" :id="uuid" :type="type" v-bind="$attrs" v-model="text" @input="onInput">
        <label :for="uuid" v-if="icon"><Icon :for="uuid" :icon="icon" /></label>
    </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref, toRefs } from "vue";
import { v4 as uuidv4 } from "uuid";

export default defineComponent({
    props: {
        type: {
            type: String,
            default: "text"
        },
        label: String,
        modelValue: String,
        icon: String
    },
    setup(props, context) {
        const uuid = ref(uuidv4());
        const { label, type, modelValue: text, icon } = toRefs(props);
        const input = ref() as Ref<HTMLInputElement>;
        
        const onInput = () => {
            context.emit("update:modelValue", text.value);
            context.emit("validate", input.value.checkValidity());
        };

        return { uuid, type, label, text, icon, input, onInput };
    }
});
</script>

<style scoped lang="scss">
</style>
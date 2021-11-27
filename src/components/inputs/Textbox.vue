<template>
    <div class="control textbox" :class="{ validate }">
        <label :for="uuid" v-if="label">{{ label }}</label>
        <Field ref="input" :id="uuid" :name="name" :type="type" v-bind="$attrs" v-model="text" @input="onInput" />
        <label :for="uuid" v-if="icon"><Icon :for="uuid" :icon="icon" /></label>
    </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref, toRefs } from "vue";
import { v4 as uuidv4 } from "uuid";

export default defineComponent({
    props: {
        name: {
            type: String,
            default: "",
        },
        type: {
            type: String,
            default: "text"
        },
        label: String,
        modelValue: String,
        icon: String,
        validate: Boolean
    },
    setup(props, context) {
        const uuid = ref(uuidv4());
        const { label, type, icon, validate } = toRefs(props);
        const text = ref(props.modelValue);
        const input = ref() as Ref<HTMLInputElement>;
        const name = props.name ? ref(props.name) : uuid;
        
        const onInput = () => {
            context.emit("update:modelValue", text.value);
        };

        return { uuid, name, type, label, text, icon, validate, input, onInput };
    }
});
</script>

<style scoped lang="scss">
</style>
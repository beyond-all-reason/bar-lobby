<template>
    <Modal :class="`dialog dialog--${type}`" :title="title" v-if="message" @close="message = ''">
        <slot/>
        <p>{{ modelValue }}</p>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRefs } from "vue";

export default defineComponent({
    props: {
        type: {
            type: String,
            default: "info",
            validator: (value: string) => ["info", "warning", "error", "choice"].includes(value)
        },
        title: {
            type: String,
            default: "",
        },
        modelValue: String
    },
    setup(props, { emit }) {
        const { type } = toRefs(props);
        const title = ref(props.title);

        if (type.value && !title.value) {
            title.value = type.value.toUpperCase();
        }

        const message = computed({
            get: () => props.modelValue,
            set: (value) => emit("update:modelValue", value)
        });

        return { type, title, message };
    }
});
</script>
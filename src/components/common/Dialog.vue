<template>
    <Modal :class="`dialog dialog--${type}`" :title="title">
        <slot/>
        <!-- <Button>Ok</Button> -->
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs } from "vue";

export default defineComponent({
    props: {
        title: {
            type: String,
            default: "",
        },
        type: {
            type: String,
            default: "info",
            validator: (value: string) => ["info", "warning", "error", "choice"].includes(value)
        }
    },
    setup(props) {
        const { type } = toRefs(props);
        const title = ref(props.title);

        if (type.value && !title.value) {
            title.value = type.value.toUpperCase();
        }

        return { title, type };
    }
});
</script>

<style scoped lang="scss">
</style>
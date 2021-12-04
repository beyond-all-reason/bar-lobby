<template>
    <Modal :class="`alert alert--${type}`" :title="title" v-if="message" @close="close">
        <slot/>
        <p>{{ message }}</p>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const { title, message, type, isFatal } = window.api.alerts.getAlert();
        const router = useRouter();

        const close = async () => {
            if (isFatal) {
                await router.replace("/");
                window.api.alerts.clearAlert();
            }
        };

        return { title, message, type, isFatal, close };
    }
});
</script>
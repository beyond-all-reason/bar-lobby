<template>
    <Modal :class="`alert alert--${type}`" :name="title" v-if="message" @close="close">
        <slot/>
        <p>{{ message }}</p>
    </Modal>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

const { title, message, type, isFatal } = window.api.alerts.getAlert();
const router = useRouter();

const close = async () => {
    if (isFatal) {
        await router.replace("/");
        window.api.alerts.clearAlert();
    }
};
</script>
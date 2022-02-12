<template>
    <Modal :class="`alert alert--${type}`" :name="title" v-if="message" @close="close">
        <slot/>
        <p>{{ message }}</p>
    </Modal>
</template>

<script lang="ts" setup>
import { api } from "@/api/api";
import { useRouter } from "vue-router";
import Modal from "@/components/common/Modal.vue";

const { title, message, type, isFatal } = api.alerts.getAlert();
const router = useRouter();

const close = async () => {
    if (isFatal) {
        await router.replace("/");
        api.alerts.clearAlert();
    }
};
</script>
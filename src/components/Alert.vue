<template>
    <Modal :class="`alert alert--${alertType}`" :title="alertTitle" v-if="alertMessage" @close="close">
        <slot/>
        <p>{{ alertMessage }}</p>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        const alertTitle = window.alerts.alertTitle;
        const alertMessage = window.alerts.alertMessage;
        const alertType = window.alerts.alertType;
        const isFatal = window.alerts.alertIsFatal;

        const close = () => window.alerts.clearAlert();

        return { alertTitle, alertMessage, alertType, isFatal, close };
    }
});
</script>
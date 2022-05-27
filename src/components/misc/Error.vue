<template>
    <Modal v-model="open" title="Fatal Error" class="error" @close="onClose">
        <div class="gap-md">
            <div>A fatal error has occurred, BAR Lobby will be reloaded.</div>
            <div class="info gap-md">
                <div>{{ error.err }}</div>
                <div>{{ error.info }}</div>
                <div>{{ error.instance }}</div>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";

import Modal from "@/components/common/Modal.vue";

const open = ref(false);
const error = api.session.error;

watch(
    () => error.err,
    () => {
        if (error.err) {
            open.value = true;
        } else {
            open.value = false;
        }
    }
);

const onClose = () => {
    error.err = undefined;
    error.instance = undefined;
    error.info = undefined;
};
</script>

<style lang="scss">
.modal.error {
    background: rgb(211, 52, 52);
}
</style>

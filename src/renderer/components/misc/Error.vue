<template>
    <Modal v-model="isVisible" title="Fatal Error" class="error-modal">
        <div class="flex-col gap-md">
            <div>A fatal error has occurred and BAR Lobby may need to reload.</div>
            <div v-if="error" class="error">{{ error.message }}</div>
            <div v-if="error?.error?.stack" class="error">{{ sanitizeStack(error.error.stack) }}</div>
            <div v-if="promiseError?.reason.stack" class="error">{{ promiseError.reason.stack }}</div>
            <Button @click="onReload">Reload</Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import { ipcRenderer } from "electron";

const isVisible = ref(false);
const error: Ref<ErrorEvent | null> = ref(null);
const promiseError: Ref<PromiseRejectionEvent | null> = ref(null);

window.addEventListener("unhandledrejection", function (event) {
    console.error(event);
    console.log("unhandled rejection");
    promiseError.value = event;
    error.value = null;
    isVisible.value = true;
});

window.addEventListener("error", (event) => {
    if (event.message === "ResizeObserver loop limit exceeded") {
        event.stopPropagation();
        console.warn(event);
        return;
    }

    error.value = event;
    promiseError.value = null;
    console.error(event);
    isVisible.value = true;
});

function onReload() {
    ipcRenderer.invoke("reloadWindow");
}

function sanitizeStack(stack: string) {
    return stack.replaceAll(/http:\/\/.*?node_modules\//g, "node_modules/");
}
</script>

<style lang="scss" scoped>
:global(.error-modal) {
    background: rgba(224, 17, 17, 0.7) !important;
}
.error {
    font-size: 16px;
    white-space: pre-line;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 10px;
    user-select: all;
}
</style>

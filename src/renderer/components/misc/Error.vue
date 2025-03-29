<template>
    <Modal v-model="isVisible" title="Fatal Error" class="error-modal">
        <div class="flex-col gap-md">
            <div>A fatal error has occurred and BAR Lobby needs to reload.</div>
            <div v-if="error" class="error">{{ error.message }}</div>
            <div v-if="promiseError?.reason.stack" class="error">{{ promiseError.reason.stack }}</div>
            <OverlayPanel ref="op">
                <div class="container">
                    {{ tooltipMessage }}
                </div>
            </OverlayPanel>
            <Button @click="uploadLogsCommand">Upload logs</Button>
            <Button @click="onReload">Reload</Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref, onBeforeUnmount } from "vue";

import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import OverlayPanel from "primevue/overlaypanel";
import { Logger, uploadLogs } from "@renderer/utils/log";

const log = new Logger("Error.vue");

const isVisible = ref(false);
const error: Ref<ErrorEvent | undefined> = ref();
const promiseError: Ref<PromiseRejectionEvent | undefined> = ref();
const tooltipMessage = ref("");
const op = ref();

onBeforeUnmount(() => {
    tooltipMessage.value = "";
});

window.addEventListener("unhandledrejection", function (event) {
    console.error(event);
    console.log("unhandled rejection");
    log.error(event.reason.stack);
    promiseError.value = event;
    isVisible.value = true;
});

window.addEventListener("error", (event) => {
    if (event.message === "ResizeObserver loop limit exceeded") {
        event.stopPropagation();
        console.warn(event);
        return;
    }

    error.value = event;
    console.error(event);
    log.error(event.message);
    isVisible.value = true;
});

function onReload() {
    window.document.location.reload();
}

async function uploadLogsCommand(event) {
    // Store off event and target to avoid async issue
    const curE = event;
    const curTarget = curE.currentTarget;

    // Do the operations
    try {
        const url = await uploadLogs();
        await navigator.clipboard.writeText(url);
        tooltipMessage.value = "Log URL was copied to clipboard.";
    } catch (e) {
        if (typeof e === "string") {
            tooltipMessage.value = e;
        } else {
            tooltipMessage.value = "Could not upload log.";
        }
    }

    // Display feedback
    op.value.show(curE, curTarget);
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
.container {
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
}
</style>

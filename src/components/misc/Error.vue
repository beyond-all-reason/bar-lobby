<template>
    <Modal name="error" title="Fatal Error" class="error">
        <div class="gap-md">
            <div>A fatal error has occurred, BAR Lobby will be reloaded.</div>
            <!-- <div v-if="isFatalError" class="info gap-md">
                <div>{{ errorData.name }}</div>
                <div>{{ errorData.message }}</div>
                <div v-if="errorData.stack">{{ errorData.stack }}</div>
            </div> -->
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { reactive } from "vue";

import Modal from "@/components/common/Modal.vue";

// TODO: catch all errors and display them here

const errorData = reactive({
    name: "",
    message: "",
    stack: "",
});

// api.modals.onPromptOpen.add((data) => {
//     if (data && typeof data === "object" && "name" in data && "message" in data) {
//         data.name;
//     }
// });
</script>

<style lang="scss">
.modal.error {
    background: rgb(211, 52, 52);
}
</style>

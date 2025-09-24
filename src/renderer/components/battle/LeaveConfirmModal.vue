<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal title="Leave Lobby?" style="height: 80vh; width: 80vw; max-width: 1440px">
        <div class="layout">
            <Icon :icon="warningIcon"></Icon>
            <h1>Warning:</h1>
            <p>You will lose your current place in this lobby. Are you sure?</p>
        </div>
        <Button class="red" @click="confirmLeave"> Confirm </Button>
        <Button class="blue" @click="cancelLeave"> Cancel </Button>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import warningIcon from "@iconify-icons/mdi/warning";

const emit = defineEmits(["confirmLeave", "cancelLeave"]);

function confirmLeave() {
    emit("confirmLeave");
}
function cancelLeave() {
    emit("cancelLeave");
}
</script>

<style lang="scss" scoped>
.layout {
    display: flex;
    flex-direction: row;
    gap: 20px;
    height: 100%;
}
</style>

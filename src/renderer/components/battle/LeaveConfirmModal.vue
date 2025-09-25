<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal title="Leave Lobby?" style="max-width: 1440px">
        <div class="layout padding-bottom-xl">
            <div><Icon :icon="warningIcon" height="64" width="64"></Icon></div>
            <h1>Warning:</h1>
        </div>
        <div class="padding-bottom-xl">
            <p>You will lose your current place in this lobby. Are you sure?</p>
        </div>
        <div class="layout">
            <Button class="red flex-left" @click="confirmLeave"> Confirm Leave Lobby</Button>
            <Button class="blue flex-right" @click="cancelLeave"> Cancel </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { Icon } from "@iconify/vue";
import warningIcon from "@iconify-icons/mdi/warning";

const emit = defineEmits(["confirmLeave", "cancelLeave"]);

const props = defineProps<{
    lobbyId?: string;
}>();

function confirmLeave() {
    emit("confirmLeave", props.lobbyId);
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
}
</style>

<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal v-model="isOpen" :title="'Rejoin Battle?'">
        <div class="container">
            <p>The server indicated that you were in an active battle.</p>
            <p>Would you like to attempt to rejoin the battle?</p>
            <div class="flex-row flex-center padding-top-lg gap-xl">
                <Button class="green fullwidth" @click="onConfirm">Rejoin</Button>
                <Button class="red fullwidth" @click="onCancel">Ignore</Button>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { tachyon, tachyonStore } from "@renderer/store/tachyon.store";

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
    }>(),
    { modelValue: false }
);

const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();
const isOpen = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit("update:modelValue", v),
});

function onConfirm() {
    console.log("Rejoining battle...");
    if (tachyonStore.springConnectionDetails) {
        tachyon.launchMultiplayerBattle(tachyonStore.springConnectionDetails);
    }
    isOpen.value = false;
}
function onCancel() {
    console.log("Ignoring rejoin battle prompt.");
    isOpen.value = false;
}
</script>

<style lang="scss" scoped></style>

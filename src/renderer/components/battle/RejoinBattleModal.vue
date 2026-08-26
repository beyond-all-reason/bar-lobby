<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal v-model="isOpen" :title="t('lobby.components.battle.rejoinBattleModal.title')">
        <div class="container">
            <p>{{ t("lobby.components.battle.rejoinBattleModal.description1") }}</p>
            <p>{{ t("lobby.components.battle.rejoinBattleModal.description2") }}</p>
            <div class="flex-row flex-center padding-top-lg gap-xl">
                <Button class="green fullwidth" @click="onConfirm">{{
                    t("lobby.components.battle.rejoinBattleModal.rejoinButton")
                }}</Button>
                <Button class="red fullwidth" @click="onCancel">{{ t("lobby.components.battle.rejoinBattleModal.ignoreButton") }}</Button>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { tachyon, tachyonStore } from "@renderer/store/tachyon.store";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

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

<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal style="height: 80vh; width: 90vw; max-width: 1400px">
        <OfflineBattleComponent :online="false" />
    </Modal>
</template>

<script lang="ts" setup>
import OfflineBattleComponent from "@renderer/components/battle/BattleComponent.vue";
import Modal from "@renderer/components/common/Modal.vue";
</script>

<style lang="scss" scoped></style>

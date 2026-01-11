<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal ref="modal" :title="t('lobby.components.misc.syncDataDirsDialog.title')">
        <div class="container flex-col gap-md">
            <p>
                {{ t("lobby.components.misc.syncDataDirsDialog.description") }}
            </p>

            <div class="flex-row gap-md">
                {{ t("lobby.components.misc.syncDataDirsDialog.otherLobbyDataDir") }}
                <input id="filepicker" type="file" name="fileList" webkitdirectory @change="test" />
            </div>

            <Button @click="stuff">{{ t("lobby.components.misc.syncDataDirsDialog.test") }}</Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { useTypedI18n } from "@renderer/i18n";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";

const { t } = useTypedI18n();

function test(evt: Event) {
    console.log(evt);
}

async function stuff() {
    //
}
</script>

<style lang="scss" scoped>
.container {
    width: 700px;
}
</style>

<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.navbar.serverSettings.title')">
        <div class="gridform">
            <div>{{ t("lobby.navbar.serverSettings.activeServer") }}</div>
            <Select v-model="settingsStore.lobbyServer" :options="serversList" optionGroupLabel="label" optionGroupChildren="items" />
            <div>{{ t("lobby.navbar.serverSettings.customServer") }}</div>
            <Textbox
                type="text"
                v-model="serverInput"
                :placeholder="t('lobby.navbar.serverSettings.placeholder')"
                @keyup.enter="addServerToList()"
                class="textbox"
            />
            <div></div>
            <div class="gridform">
                <Button @click="addServerToList()">{{ t("lobby.navbar.serverSettings.add") }}</Button>
                <Button @click="removeServerFromList()" :disabled="disableRemoveButton">{{
                    t("lobby.navbar.serverSettings.remove")
                }}</Button>
            </div>
            <OverlayPanel ref="op">
                <div class="container">
                    {{ tooltipMessage }}
                </div>
            </OverlayPanel>
        </div>
        <div class="margin-md">{{ t("lobby.navbar.serverSettings.info") }}</div>
    </Modal>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Select from "@renderer/components/controls/Select.vue";
import Button from "@renderer/components/controls/Button.vue";
import OverlayPanel from "primevue/overlaypanel";
import { settingsStore } from "@renderer/store/settings.store";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const serverInput = ref("");

const op = ref();
const tooltipMessage = ref("");

const defaultServers: string[] = [
    "wss://server4.beyondallreason.info",
    "wss://server5.beyondallreason.info",
    "wss://lobby-server-dev.beyondallreason.dev",
    "ws://localhost:4000",
];

const disableRemoveButton = computed(() => {
    return defaultServers.includes(settingsStore.lobbyServer);
});

const serversList = ref([
    {
        label: " - Default Servers",
        items: defaultServers,
    },
    {
        label: " - Custom Servers",
        items: settingsStore.customServerList,
    },
]);

function addServerToList() {
    //Disallow empty strings
    if (serverInput.value == "") {
        return;
    }
    //disallow duplicates of the default servers
    if (defaultServers.includes(serverInput.value)) {
        return;
    }
    settingsStore.customServerList.push(serverInput.value);
    serversList.value = [
        {
            label: " - Default Servers",
            items: defaultServers,
        },
        {
            label: " - Custom Servers",
            items: settingsStore.customServerList,
        },
    ];
    serverInput.value = "";
}

function removeServerFromList() {
    const index = settingsStore.customServerList.indexOf(settingsStore.lobbyServer);
    settingsStore.customServerList.splice(index, 1);
    //Bounce back to the primary default when an entry is deleted
    settingsStore.lobbyServer = defaultServers[0];
}
</script>

<style lang="scss" scoped>
.container {
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
}
.textbox {
    justify-self: normal;
}
</style>

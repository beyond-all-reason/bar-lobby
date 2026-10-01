<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.navbar.serverSettings.title')">
        <div class="gridform">
            <div>{{ t("lobby.navbar.serverSettings.activeServer") }}</div>
            <Select
                v-model="selectedServer"
                :options="serversList"
                optionLabel="label"
                optionValue="value"
                optionGroupLabel="label"
                optionGroupChildren="items"
            />
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
import { configStore } from "@renderer/store/config.store";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const serverInput = ref("");

const op = ref();
const tooltipMessage = ref("");

const defaultServers: string[] = [...configStore.defaultServers];

const disableRemoveButton = computed(() => {
    // Only custom entries can be removed; the active server may also be one that is in neither list
    return !settingsStore.customServerList.includes(settingsStore.lobbyServerOverride);
});

function serverOption(server: string) {
    return { label: server, value: server };
}

// The dropdown treats an empty string as no selection, this is a unique value for default
const FOLLOW_DEFAULT = Symbol("followDefault");

const selectedServer = computed({
    get: () => settingsStore.lobbyServerOverride || FOLLOW_DEFAULT,
    set: (value: string | typeof FOLLOW_DEFAULT) => {
        settingsStore.lobbyServerOverride = value === FOLLOW_DEFAULT ? "" : value;
    },
});

const serversList = computed(() => [
    {
        label: t("lobby.navbar.serverSettings.labelDefault"),
        items: [
            { label: t("lobby.navbar.serverSettings.followDefault", { server: defaultServers[0] }), value: FOLLOW_DEFAULT },
            ...defaultServers.map(serverOption),
        ],
    },
    {
        label: t("lobby.navbar.serverSettings.labelCustom"),
        items: settingsStore.customServerList.map(serverOption),
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
    serverInput.value = "";
}

function removeServerFromList() {
    const index = settingsStore.customServerList.indexOf(settingsStore.lobbyServerOverride);
    if (index === -1) {
        return;
    }
    settingsStore.customServerList.splice(index, 1);
    //Go back to following the default when an entry is deleted
    settingsStore.lobbyServerOverride = "";
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

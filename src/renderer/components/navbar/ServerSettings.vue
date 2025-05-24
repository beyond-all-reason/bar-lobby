<template>
    <Modal title="lobby server settings">
        <div class="gridform">
            <div>Active Server</div>
            <Select v-model="settingsStore.lobbyServer" :options="serversList" optionGroupLabel="label" optionGroupChildren="items" />
            <div>Custom Server</div>
            <Textbox type="text" v-model="serverInput" placeholder="Server URL or IP" @keyup.enter="addServerToList()" class="textbox" />
            <div></div>
            <div class="gridform">
                <Button @click="addServerToList()">Add</Button>
                <Button @click="removeServerFromList()" :disabled="disableRemoveButton">Remove</Button>
            </div>
            <OverlayPanel ref="op">
                <div class="container">
                    {{ tooltipMessage }}
                </div>
            </OverlayPanel>
        </div>
        <div class="margin-md">Changing the Active Server has immediate effect. Remember to log in after switching.</div>
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

const serverInput = ref("");

const op = ref();
const tooltipMessage = ref("");

const defaultServers: string[] = [
    "server4.beyondallreason.info",
    "server5.beyondallreason.info",
    "lobby-server-dev.beyondallreason.dev",
    "localhost:8200",
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

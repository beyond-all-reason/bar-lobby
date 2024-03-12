<template>
    <div class="debug-sidebar" :class="{ active }">
        <div class="toggle">
            <Button @click="active = !active">
                <Icon :icon="tools" :height="20" />
            </Button>
        </div>
        <Select
            :modelValue="currentRoute"
            label="View"
            :options="routes"
            :filter="true"
            optionLabel="path"
            optionValue="path"
            :placeholder="currentRoute.path"
            class="fullwidth"
            @update:model-value="onRouteSelect"
        />
        <Button to="/debug"> Debug Sandbox </Button>
        <Button @click="openSettings"> Open Settings File </Button>
        <Button @click="openContentDir"> Open Content Dir </Button>
        <Button @click="openConfigDir"> Open Config Dir </Button>
        <Button @click="openStartScript"> Open Latest Start Script </Button>
        <Button @click="attemptCacheErrorMaps"> Recache Errored Maps </Button>
        <Button @click="openSyncLobbyContentTool"> Sync Lobby Content Tool </Button>
        <Button @click="test"> Test </Button>

        <!-- <SyncDataDirsDialog v-model="syncLobbyContentToolOpen" /> -->
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import tools from "@iconify-icons/mdi/tools";
import { shell } from "electron";
import * as path from "path";
import { ref } from "vue";
import { useRouter } from "vue-router";

import Button from "@/components/controls/Button.vue";
import Select from "@/components/controls/Select.vue";

const active = ref(false);
const syncLobbyContentToolOpen = ref(false);

const router = useRouter();
const routes = router.getRoutes().sort((a, b) => a.path.localeCompare(b.path));
const currentRoute = api.router.currentRoute;

async function onRouteSelect(newRoute) {
    await api.router.replace(newRoute);
}

function openSettings() {
    shell.openPath(api.settings.filePath);
}

async function openContentDir() {
    await shell.openPath(api.info.contentPath);
}

async function openConfigDir() {
    await shell.openPath(api.info.configPath);
}

async function openStartScript() {
    await shell.openPath(path.join(api.info.contentPath, api.game.scriptName));
}

async function attemptCacheErrorMaps() {
    await api.cacheDb.deleteFrom("mapError").execute();

    await api.content.maps.queueMapsToCache();
}

function openSyncLobbyContentTool() {
    syncLobbyContentToolOpen.value = true;
}

async function test() {
    //await shell.openExternal("https://www.google.com");
    await api.comms.auth({ open: shell.openExternal });
}
</script>

<style lang="scss" scoped>
.debug-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100%;
    z-index: 15;
    background: #111;
    border-left: 1px solid #222;
    transform: translateX(100%);
    transition: transform 0.1s;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 10px;
    &.active {
        transform: translateX(0);
        box-shadow: -5px 0 5px rgba(0, 0, 0, 0.5);
    }
    .toggle {
        position: absolute;
        bottom: 0;
        left: 0;
        :deep(.button) {
            transform: translateX(-100%);
            background: #111;
            border: 1px solid #222;
            border-right: none;
            border-bottom: none;
            box-shadow: -5px 2px 5px rgba(0, 0, 0, 0.5);
            &:hover {
                background: #222;
            }
        }
    }
}
</style>

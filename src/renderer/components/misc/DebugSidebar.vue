<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

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
        <Button @click="openAssetsDir"> Open Assets Dir </Button>
        <Button @click="openStateDir"> Open State Dir </Button>
        <Button @click="openStartScript"> Open Latest Start Script </Button>
        <Button @click="openSyncLobbyContentTool"> Sync Lobby Content Tool </Button>
        <Button @click="causeError"> Cause an error </Button>

        <Select
            :modelValue="gameStore.selectedGameVersion"
            :options="gameListOptions"
            optionLabel="gameVersion"
            label="Game"
            :filter="true"
            @update:model-value="onGameSelected"
        />

        <Select
            :modelValue="enginesStore.selectedEngineVersion"
            :options="enginesStore.availableEngineVersions"
            data-key="id"
            option-label="id"
            label="Engine"
            :filter="true"
            class="fullwidth"
            @update:model-value="(engine) => (enginesStore.selectedEngineVersion = engine)"
        />
        <Button @click="serverSettingsOpen = true">Lobby Server Settings</Button>
        <SyncDataDirsDialog v-model="syncLobbyContentToolOpen" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import tools from "@iconify-icons/mdi/tools";
import { ref } from "vue";
import { useRouter } from "vue-router";

import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import SyncDataDirsDialog from "@renderer/components/misc/SyncDataDirsDialog.vue";
import { useDexieLiveQuery } from "@renderer/composables/useDexieLiveQuery";
import { db } from "@renderer/store/db";
import { gameStore } from "@renderer/store/game.store";
import { enginesStore } from "@renderer/store/engine.store";
import { GameVersion } from "@main/content/game/game-version";
import { inject, Ref } from "vue";

const active = ref(false);
const syncLobbyContentToolOpen = ref(false);

const serverSettingsOpen = inject<Ref<boolean>>("serverSettingsOpen")!;

const router = useRouter();
const routes = router.getRoutes().sort((a, b) => a.path.localeCompare(b.path));
const currentRoute = router.currentRoute;

const gameListOptions = useDexieLiveQuery(() => db.gameVersions.toArray());

async function onGameSelected(gameVersion: GameVersion) {
    gameStore.selectedGameVersion = gameVersion;
}

async function onRouteSelect(newRoute: string) {
    console.log("Navigating to", newRoute);
    await router.replace(newRoute);
}

async function openSettings() {
    await window.shell.openSettingsFile().catch((error) => console.error(error));
}

async function openAssetsDir() {
    await window.shell.openAssetsDir().catch((error) => console.error(error));
}

async function openStateDir() {
    await window.shell.openStateDir().catch((error) => console.error(error));
}

async function openStartScript() {
    await window.shell.openStartScript().catch((error) => console.error(error));
}

function openSyncLobbyContentTool() {
    syncLobbyContentToolOpen.value = true;
}

function causeError() {
    const x = null;
    /* eslint-disable */
    // @ts-expect-error: testing an intentional error
    const j = x.hello;
    /* eslint-enable */
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

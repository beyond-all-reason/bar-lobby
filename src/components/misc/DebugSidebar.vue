<template>
    <div class="debug-sidebar" :class="{ active }">
        <div class="toggle">
            <Button @click="active = !active">
                <Icon :icon="tools" :height="20" />
            </Button>
        </div>
        <Select2 v-model="currentRoute" label="View" :options="routes" optionLabel="path" optionValue="path" />
        <Button to="/debug/playground" :flexGrow="false" fullWidth> Debug Playground </Button>
        <Button :flexGrow="false" fullWidth @click="openSettings"> Open Settings File </Button>
        <Button :flexGrow="false" fullWidth @click="openLobbyDir"> Open Lobby Dir </Button>
        <Button :flexGrow="false" fullWidth @click="openDataDir"> Open Data Dir </Button>
        <Button :flexGrow="false" fullWidth @click="openStartScript"> Open Latest Start Script </Button>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import tools from "@iconify-icons/mdi/tools";
import { shell } from "electron";
import * as path from "path";
import { effectScope, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import Button from "@/components/inputs/Button.vue";
import Select2 from "@/components/inputs/Select.vue";

const scope = effectScope();

const active = ref(false);

const route = useRoute();
const router = useRouter();
const routes = router.getRoutes().sort((a, b) => a.path.localeCompare(b.path));
const currentRoute = ref(route.path);

const openSettings = () => {
    api.settings.openFileInEditor();
};

function openPathWithLog(path: string) {
    shell.openPath(path).then(error => {
        if (error) {
            console.error(`Failed to open ${api.info.userDataPath}: ${error}`);
        }
    });
}

const openLobbyDir = () => {
    openPathWithLog(api.info.userDataPath);
};

const openDataDir = () => {
    openPathWithLog(api.settings.model.dataDir.value);
};

const openStartScript = async () => {
    const startScriptPath = path.join(api.settings.model.dataDir.value, "barlobby_script.txt");
    openPathWithLog(startScriptPath);
};

scope.run(() => {
    watch(currentRoute, async () => {
        await router.replace(currentRoute.value);
    });

    watch(router.currentRoute, () => {
        currentRoute.value = route.path;
    });
});
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
        :deep(button) {
            transform: translateX(-100%);
            background: #111;
            border: 1px solid #222;
            border-right: none;
            border-bottom: none;
            box-shadow: -5px 2px 5px rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            &:hover {
                background: #222;
            }
        }
    }
}
</style>

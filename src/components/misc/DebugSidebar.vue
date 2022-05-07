<template>
    <div class="debug-sidebar" :class="{ active }">
        <div class="debug-sidebar__toggle">
            <Button @click="active = !active">
                <Icon icon="tools" :size="20" />
            </Button>
        </div>
        <Select v-model="currentRoute" label="View" :options="routes" :label-by="(route: any) => route.path" :value-by="(route: any) => route.path" full-width :searchable="true" :clear-on-select="true" />
        <Button to="/debug/playground" :flex-grow="false" full-width>
            Debug Playground
        </Button>
        <Button :flex-grow="false" full-width @click="openSettings">
            Open Settings File
        </Button>
        <Button :flex-grow="false" full-width @click="openLobbyDir">
            Open Lobby Dir
        </Button>
        <Button :flex-grow="false" full-width @click="openDataDir">
            Open Data Dir
        </Button>
        <Button :flex-grow="false" full-width @click="openStartScript">
            Open Latest Start Script
        </Button>
    </div>
</template>

<script lang="ts" setup>
import * as path from "path";
import { ref, effectScope, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { shell } from "electron";
import Icon from "@/components/common/Icon.vue";
import Select from "@/components/inputs/Select.vue";
import Button from "@/components/inputs/Button.vue";

const scope = effectScope();

const active = ref(false);

const route = useRoute();
const router = useRouter();
const routes = router.getRoutes().sort((a, b) => a.path.localeCompare(b.path));
const currentRoute = ref(route.path);

const openSettings = () => {
    api.settings.openFileInEditor();
};

const openLobbyDir = () => {
    shell.openPath(api.info.userDataPath);
};

const openDataDir = () => {
    shell.openPath(api.settings.model.dataDir.value);
};

const openStartScript = async () => {
    const startScriptPath = path.join(api.settings.model.dataDir.value, "barlobby_script.txt");
    shell.openPath(startScriptPath);
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
<template>
    <div class="debug-sidebar" :class="{ active }">
        <Button class="toggle" @click="active = !active">
            <Icon icon="tools" :size="20" />
        </button>

        <Select label="View" v-model="currentRoute" :options="routes" :label-by="(route: any) => route.path" :value-by="(route: any) => route.path" :searchable="true" :clear-on-select="true" />

        <div class="flex-row">
            <Button to="/debug/inputs">Debug Land</Button>
        </div>
        <div class="flex-row">
            <Button @click="openSettings">Open Settings File</Button>
        </div>
        <div class="flex-row">
            <Button @click="openLobbyDir">Open Lobby Dir</Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { readonly, ref, effectScope, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { shell } from "electron";
import Icon from "@/components/common/Icon.vue";
import Select from "@/components/inputs/Select.vue";
import Button from "@/components/inputs/Button.vue";

const scope = effectScope();

const active = ref(false);

const route = useRoute();
const router = useRouter();
const routes = readonly(router.getRoutes().sort((a, b) => a.path.localeCompare(b.path)));
const currentRoute = ref(route.path);

const openSettings = () => {
    window.api.settings.openFileInEditor();
};

const openLobbyDir = async () => {
    shell.openPath(window.info.userDataPath);
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
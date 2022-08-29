<template>
    <div class="debug-sidebar" :class="{ active }">
        <div class="toggle">
            <Button @click="active = !active">
                <Icon :icon="tools" :height="20" />
            </Button>
        </div>
        <Select :modelValue="currentRoute" label="View" :options="routes" :filter="true" optionLabel="path" optionValue="path" :placeholder="currentRoute" />
        <Button to="/debug"> Debug Sandbox </Button>
        <Button @click="openSettings"> Open Settings File </Button>
        <Button @click="openContentDir"> Open Content Dir </Button>
        <Button @click="generateStartScript"> Generate Start Script </Button>
        <Button @click="openStartScript"> Open Latest Start Script </Button>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import tools from "@iconify-icons/mdi/tools";
import { shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import { effectScope, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import Button from "@/components/inputs/Button.vue";
import Select from "@/components/inputs/Select.vue";

const scope = effectScope();

const active = ref(false);

const route = useRoute();
const router = useRouter();
const routes = router.getRoutes().sort((a, b) => a.path.localeCompare(b.path));
const currentRoute = ref(route.path);

const openSettings = () => {
    api.settings.openFileInEditor();
};

const openContentDir = async () => {
    await shell.openPath(api.info.contentPath);
};

const generateStartScript = async () => {
    const battle = api.session.onlineBattle.value ?? api.session.offlineBattle.value;
    if (!battle) {
        console.warn("Tried to generate start script but not in a battle");
        return;
    }
    const engineVersion = battle.battleOptions.engineVersion;
    const enginePath = path.join(api.info.contentPath, "engine", engineVersion).replaceAll("\\", "/");
    const scriptPath = path.join(api.info.contentPath, "barlobby_script.txt");

    let scriptStr = api.game.battleToStartScript(battle);

    await fs.promises.writeFile(scriptPath, scriptStr);
};

const openStartScript = async () => {
    await shell.openPath(path.join(api.info.contentPath, "barlobby_script.txt"));
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

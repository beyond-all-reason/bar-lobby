<template>
    <div class="debug-sidebar" :class="{ active }">
        <button class="toggle" @click="active = !active">
            <Icon icon="tools" :size="20" />
        </button>

        <Select label="Route" v-model="currentRoute" :options="routes" :label-by="route => route.path" :value-by="route => route.path" :searchable="true" :clear-on-select="true" />

        <div class="flex-row">
            <Button @click="openSettings">Open Settings File</Button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, readonly, ref, watch, effectScope } from "vue";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const scope = effectScope();

        const active = ref(false);

        const route = useRoute();
        const router = useRouter();
        const routes = readonly(router.getRoutes().filter(route => route.name).sort((a, b) => a.path.localeCompare(b.path)));
        const currentRoute = ref(route.path);

        const openSettings = () => {
            window.api.settings.openFileInEditor();
        };

        scope.run(() => {
            watch(currentRoute, async () => {
                await router.replace(currentRoute.value);
            });

            watch(router.currentRoute, () => {
                currentRoute.value = route.path;
            });
        });

        return { routes, currentRoute, active, openSettings };
    }
});
</script>

<style scoped lang="scss">
.debug-sidebar {
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    height: 100%;
    z-index: 10;
    background: #111;
    border-left: 1px solid #222;
    transform: translateX(100%);
    transition: transform 0.1s;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    &.active {
        transform: translateX(0);
        box-shadow: -5px 0 5px rgba(0, 0, 0, 0.5);
    }
}
.toggle {
    position: absolute;
    bottom: 0;
    left: 0;
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
</style>
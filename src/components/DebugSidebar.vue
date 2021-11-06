<template>
    <div class="debug-sidebar" :class="{ active }">
        <div class="fullsize">
            <button class="toggle" @click="active = !active">
                <Icon icon="wrench" :size="40" />
            </button>
        </div>

        <select v-model="currentRoute">
            <option v-for="route in routes" :key="route.path" :value="route.path">
                {{ route.path }}
            </option>
        </select>

        <select v-model="selectedScreen">
            <option v-for="(screenId, index) in screenIds" :key="screenId" :value="index">
                Screen {{ index + 1 }}
            </option>
        </select>
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
        const routes = readonly(router.getRoutes().filter(route => route.name));
        const currentRoute = ref(route.path);

        const screenIds = ref([0]);
        const selectedScreen = ref(0);

        window.getHardwareInfo().then((hardwareInfo) => {
            screenIds.value = hardwareInfo.screenIds;
        });

        scope.run(() => {
            watch(selectedScreen, (selectedScreen) => {
                window.setDisplay(selectedScreen);
            });

            watch(currentRoute, async () => {
                await router.replace(currentRoute.value);
            });

            watch(router.currentRoute, () => {
                currentRoute.value = route.path;
            });
        });

        return { screenIds, selectedScreen, routes, currentRoute, active };
    }
});
</script>

<style scoped lang="scss">
.debug-sidebar {
    position: absolute;
    top: 0;
    left: 0;
    width: 300px;
    height: 100%;
    z-index: 10;
    background: #111;
    border-right: 1px solid #222;
    box-shadow: 5px 0 5px rgba(0, 0, 0, 0.5);
    transform: translateX(-100%);
    transition: transform 0.1s;
    &.active {
        transform: translateX(0);
    }
}
.toggle {
    position: absolute;
    right: 0;
    transform: translateX(100%);
    background: #111;
    border-right: 1px solid #222;
    border-bottom: 1px solid #222;
    box-shadow: 5px 2px 5px rgba(0, 0, 0, 0.5);
    width: 60px;
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
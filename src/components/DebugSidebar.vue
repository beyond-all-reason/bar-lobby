<template>
    <div class="debug-sidebar" :class="{ active }">
        <div class="fullsize">
            <button class="toggle" @click="active = !active">
                <Icon icon="tools" :size="20" />
            </button>
        </div>

        <div class="control">
            <label>Route Selector</label>
            <select v-model="currentRoute">
                <option v-for="route in routes" :key="route.path" :value="route.path">
                    {{ route.path }}
                </option>
            </select>
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

        scope.run(() => {
            watch(currentRoute, async () => {
                await router.replace(currentRoute.value);
            });

            watch(router.currentRoute, () => {
                currentRoute.value = route.path;
            });
        });

        return { routes, currentRoute, active };
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
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    &.active {
        transform: translateX(0);
    }
}
.toggle {
    position: absolute;
    bottom: 0;
    right: 1px;
    transform: translateX(100%);
    background: #111;
    border-right: 1px solid #222;
    border-bottom: 1px solid #222;
    border-left: 1px solid #111;
    box-shadow: 5px 2px 5px rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    &:hover {
        background: #222;
    }
}
</style>
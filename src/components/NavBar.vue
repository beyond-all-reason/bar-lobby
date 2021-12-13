<template>
    <div class="nav">
        <Button class="primary-item logo" depress to="/home">
            <img src="@/assets/images/logo.svg">
        </Button>
        <div class="flex-col flex-grow">
            <div class="flex-row flex-space-between gap-1">
                <div class="left">
                    <Button v-for="view in primaryRoutes" :key="view.path" :to="view.path" class="primary-item">{{ view.meta.title }}</Button>
                </div>
                <div class="right">
                    <Button class="primary-item" to="/profile">
                        Jazcash
                    </Button>
                    <Button class="primary-item icon" :class="{ active: settingsOpen }" @click="settingsOpen = !settingsOpen">
                        <Icon icon="cog" :size="40" />
                    </Button>
                    <Button class="primary-item icon">
                        <Icon icon="close-thick" :size="40" />
                    </Button>
                </div>
            </div>
            <div class="secondary-nav">
                <Button v-for="view in secondaryRoutes" :key="view.path" :to="view.path" class="secondary-item">{{ view.meta.title ?? view.name }}</Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const { settingsOpen } = window.api.session; // TODO: needed?

        const router = useRouter();
        const route = useRoute();
        const allRoutes = router.getRoutes();

        const primaryRoutes = allRoutes
            .filter(r => ["/singleplayer", "/multiplayer", "/library", "/learn", "/store"].includes(r.path))
            .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));

        const secondaryRoutes = computed(() => {
            return allRoutes
                .filter(r => r.meta.order !== undefined && r.path.startsWith(`/${route.path.split("/")[1]}/`))
                .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));
        });

        return { route, settingsOpen, primaryRoutes, secondaryRoutes };
    }
});
</script>
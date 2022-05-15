<template>
    <div class="nav" :class="{ hidden }">
        <div class="nav__logo">
            <Button depress to="/home">
                <img src="@/assets/images/logo.svg">
            </Button>
        </div>
        <div class="flex-col flex-grow">
            <div class="nav__primary flex-row flex-space-between gap-xxs">
                <div class="nav__primary-left">
                    <Button v-for="view in primaryRoutes" :key="view.path" :to="view.path">
                        {{ view.meta.title }}
                    </Button>
                </div>
                <div class="nav__primary-right">
                    <Button class="icon" to="/profile">
                        <Icon icon="account" :size="40" />
                    </Button>
                    <DownloadsButton />
                    <Button class="icon" @click="settingsModal">
                        <Icon icon="cog" :size="40" />
                    </Button>
                    <Button class="icon close" @click="exitModal">
                        <Icon icon="close-thick" :size="40" />
                    </Button>
                </div>
            </div>
            <div class="nav__secondary">
                <div class="nav__secondary-left flex-row flex-left">
                    <Button v-for="view in secondaryRoutes" :key="view.path" :to="view.path" class="secondary-item">
                        {{ view.meta.title ?? view.name }}
                    </Button>
                </div>
                <div class="nav__secondary-right flex-row flex-right flex-center">
                    <ServerInfo />
                    <div>
                        {{ lobbyVersion }}
                    </div>
                </div>
            </div>
        </div>
        <Downloads />
        <Settings />
        <Exit />
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "@/components/common/Icon.vue";
import Button from "@/components/inputs/Button.vue";
import Exit from "@/components/misc/Exit.vue";
import Settings from "@/components/misc/Settings.vue";
import ServerInfo from "@/components/misc/ServerInfo.vue";
import DownloadsButton from "@/components/misc/DownloadsButton.vue";
import Downloads from "@/components/misc/Downloads.vue";

const router = useRouter();
const route = useRoute();
const allRoutes = router.getRoutes();

const props = defineProps<{
    hidden?: boolean;
}>();

const primaryRoutes = allRoutes
    .filter(r => ["/singleplayer", "/multiplayer", "/library", "/learn", "/store", "/development"].includes(r.path))
    .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));

const secondaryRoutes = computed(() => {
    return allRoutes
        .filter(r => r.meta.order !== undefined && r.path.startsWith(`/${route.path.split("/")[1]}/`))
        .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));
});

const settingsModal = () => api.modals.open("settings");
const exitModal = () => api.modals.open("exit");

const lobbyVersion = `${api.info.lobby.name} v${api.info.lobby.version}`;
</script>
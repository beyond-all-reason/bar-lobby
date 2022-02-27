<template>
    <div class="nav" :class="{ hidden }">
        <Button class="primary-item logo" depress to="/home">
            <img src="@/assets/images/logo.svg">
        </Button>
        <div class="flex-col flex-grow">
            <div class="flex-row flex-space-between gap-xxs">
                <div class="left">
                    <Button v-for="view in primaryRoutes" :key="view.path" :to="view.path" class="primary-item">{{ view.meta.title }}</Button>
                </div>
                <div class="right">
                    <Button v-if="session?.user?.name" class="primary-item" to="/profile">
                        {{ session?.user.name }}
                    </Button>
                    <Button class="primary-item icon" @click="settingsModal">
                        <Icon icon="cog" :size="40" />
                    </Button>
                    <Button class="primary-item icon">
                        <Icon icon="download" :size="40" />
                    </Button>
                    <Button class="primary-item icon close" @click="exitModal">
                        <Icon icon="close-thick" :size="40" />
                    </Button>
                </div>
            </div>
            <div class="secondary-nav">
                <div class="flex-row flex-left">
                    <Button v-for="view in secondaryRoutes" :key="view.path" :to="view.path" class="secondary-item">{{ view.meta.title ?? view.name }}</Button>
                </div>
                <div class="flex-row flex-right flex-center">
                    <ServerInfo />
                </div>
            </div>
        </div>
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

const settingsModal = () => {
    window.api.modals.open("settings");
};

const exitModal = () => {
    window.api.modals.open("exit");
};

const session = window.api.session.model;
</script>
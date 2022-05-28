<template>
    <div class="nav" :class="{ hidden }">
        <div class="nav__logo">
            <Button depress to="/home">
                <img src="@/assets/images/logo.svg" />
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
                    <Button class="icon" to="/profile" tooltip="Profile">
                        <Icon :icon="account" :height="40" />
                    </Button>
                    <DownloadsButton tooltip="Downloads" @click="downloadsOpen = true" />
                    <Button class="icon" tooltip="Settings" @click="settingsOpen = true">
                        <Icon :icon="cog" :height="40" />
                    </Button>
                    <Button class="icon close" tooltip="Exit" @click="exitOpen = true">
                        <Icon :icon="closeThick" :height="40" />
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
        <Downloads v-model="downloadsOpen" />
        <Settings v-model="settingsOpen" />
        <Exit v-model="exitOpen" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import closeThick from "@iconify-icons/mdi/close-thick";
import cog from "@iconify-icons/mdi/cog";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import Button from "@/components/inputs/Button.vue";
import Downloads from "@/components/misc/Downloads.vue";
import DownloadsButton from "@/components/misc/DownloadsButton.vue";
import Exit from "@/components/misc/Exit.vue";
import ServerInfo from "@/components/misc/ServerInfo.vue";
import Settings from "@/components/misc/Settings.vue";

const props = defineProps<{
    hidden?: boolean;
}>();

const router = useRouter();
const route = useRoute();
const allRoutes = router.getRoutes();

const primaryRoutes = allRoutes
    .filter((r) => ["/singleplayer", "/multiplayer", "/library", "/learn", "/store", "/development"].includes(r.path))
    .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));

const secondaryRoutes = computed(() => {
    return allRoutes.filter((r) => r.meta.order !== undefined && r.path.startsWith(`/${route.path.split("/")[1]}/`)).sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));
});

const downloadsOpen = ref(false);
const settingsOpen = ref(false);
const exitOpen = ref(false);

const lobbyVersion = `${api.info.lobby.name} v${api.info.lobby.version}`;
</script>

<style lang="scss">
.nav {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    backdrop-filter: blur(5px);
    background: linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.9));
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 3px 5px rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    gap: 1px;
    transition: transform 0.3s, opacity 0.3s;
    &.hidden {
        opacity: 0;
        transform: translateY(-100%);
    }
    &:before {
        @extend .fullsize;
        content: "";
        z-index: -1;
        opacity: 0.2;
        background-image: url("~@/assets/images/squares.png");
    }
    &__logo {
        flex-grow: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
        height: 100%;
        box-shadow: 1px 0 0 rgba(255, 255, 255, 0.1);
        img {
            height: 40px;
            opacity: 0.9;
        }
        &:hover img,
        &.active img {
            opacity: 1;
        }
        img {
            height: 50px;
        }
        .control.button {
            flex-grow: 1;
        }
    }
    &__primary,
    &__logo {
        .btn {
            padding: 10px 25px;
            display: flex;
            align-items: center;
            font-size: 25px;
            font-weight: 600;
            background: radial-gradient(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.05));
            color: rgba(255, 255, 255, 0.8);
            box-shadow: 1px 0 0 rgba(255, 255, 255, 0.05), -1px 0 0 rgba(255, 255, 255, 0.05);
            border: none;
            flex-grow: 0;
            height: 100%;
            &.icon {
                padding: 10px 15px;
            }
            &:hover,
            &.active {
                background: radial-gradient(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.15));
                color: #fff;
                text-shadow: 0 0 7px #fff;
                box-shadow: 1px 0 0 rgba(255, 255, 255, 0.2), -1px 0 0 rgba(255, 255, 255, 0.2), 0 1px 0 rgba(255, 255, 255, 0.2), 7px -3px 10px rgba(0, 0, 0, 0.5), -7px -3px 10px rgba(0, 0, 0, 0.5) !important;
            }
            &.active {
                z-index: 1;
            }
            &:hover {
                z-index: 2;
            }
        }
    }
    .control.button {
        align-self: unset;
    }
    &__primary-left,
    &__primary-right {
        display: flex;
        flex-direction: row;
        gap: 1px;
    }
    &__primary-left {
        box-shadow: 5px 0 20px rgba(0, 0, 0, 0.4);
        &:first-child {
            box-shadow: 1px 0 0 rgba(255, 255, 255, 0.05);
        }
        &:last-child {
            box-shadow: -1px 0 0 rgba(255, 255, 255, 0.05), 1px 0 0 rgba(255, 255, 255, 0.15);
        }
    }
    &__primary-right {
        box-shadow: -5px 0 20px rgba(0, 0, 0, 0.4);
        &:first-child {
            box-shadow: 1px 0 0 rgba(255, 255, 255, 0.05), -1px 0 0 rgba(255, 255, 255, 0.15);
        }
        &:last-child {
            box-shadow: -1px 0 0 rgba(255, 255, 255, 0.05);
        }
    }
    &__secondary {
        flex-direction: row;
        background: linear-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.3));
        width: 100%;
        box-shadow: inset 2px 2px 10px rgba(0, 0, 0, 0.5);
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        display: flex;
        height: 36px;
        .btn {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            flex-grow: 0;
            padding: 0 25px;
            &:hover,
            &.active {
                color: #fff;
                background: rgba(255, 255, 255, 0.05);
                box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.2);
            }
        }
        &-right {
            padding-right: 10px;
            & > *:not(:last-child) {
                border-right: 1px solid rgba(255, 255, 255, 0.2);
                margin-right: 7px;
            }
        }
    }
    .close {
        &:hover {
            background: rgba(255, 0, 0, 0.2);
            box-shadow: 1px 0 0 rgba(255, 47, 47, 0.418), -1px 0 0 rgba(255, 47, 47, 0.418), 0 1px 0 rgba(255, 47, 47, 0.418), 7px -3px 10px rgba(0, 0, 0, 0.5), -7px -3px 10px rgba(0, 0, 0, 0.5) !important;
        }
    }
}
</style>

<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="nav" :class="{ hidden }">
        <div class="logo">
            <Button to="/play/menu?">
                <img src="/src/renderer/assets/images/logo.svg" />
            </Button>
        </div>
        <div class="flex-col flex-grow">
            <div class="primary flex-row flex-space-between gap-xxs">
                <div class="primary-left">
                    <Button v-for="view in primaryRoutes" :key="view.path" :to="view.path">
                        {{ view.meta.title }}
                    </Button>
                </div>
                <div class="drag-window-area"></div>
                <div class="primary-right">
                    <Button
                        v-if="false"
                        v-tooltip.bottom="t('lobby.navbar.tooltips.directMessages')"
                        v-click-away:messages="() => (messagesOpen = false)"
                        :class="['icon', { active: messagesOpen }]"
                        @click="messagesOpen = true"
                    >
                        <Icon :icon="messageIcon" :height="40" />
                        <div v-if="messagesUnread" class="unread-dot"></div>
                    </Button>
                    <Button
                        v-if="me.isAuthenticated"
                        v-tooltip.bottom="t('lobby.navbar.tooltips.friends')"
                        v-click-away:friends="() => (friendsOpen = false)"
                        :class="['icon', { active: friendsOpen }]"
                        @click="friendsOpen = !friendsOpen"
                    >
                        <Icon :icon="accountMultiple" :height="40" />
                    </Button>
                    <DownloadsButton
                        v-tooltip.bottom="t('lobby.navbar.tooltips.downloads')"
                        v-click-away:downloads="() => (downloadsOpen = false)"
                        :class="['icon', { active: downloadsOpen }]"
                        @click="downloadsOpen = !downloadsOpen"
                    />
                    <Button v-tooltip.bottom="t('lobby.navbar.tooltips.settings')" class="icon" @click="settingsOpen = true">
                        <Icon :icon="cog" :height="40" />
                    </Button>
                    <Button v-tooltip.bottom="t('lobby.navbar.tooltips.minimize')" class="icon" @click="minimizeWindow">
                        <Icon :icon="windowMinimize" :height="40"></Icon>
                    </Button>
                    <Button
                        v-tooltip.bottom="
                            settingsStore.fullscreen ? t('lobby.navbar.tooltips.windowed') : t('lobby.navbar.tooltips.fullscreen')
                        "
                        class="icon"
                        @click="toggleFullscreen"
                    >
                        <Icon v-if="settingsStore.fullscreen" :icon="fullscreenExit" :height="40"></Icon>
                        <Icon v-else :icon="fullscreen" :height="40"></Icon>
                    </Button>
                    <Button v-tooltip.bottom="t('lobby.navbar.tooltips.exit')" class="icon close" @click="exitOpen = true">
                        <Icon :icon="closeThick" :height="40" />
                    </Button>
                </div>
            </div>
            <div class="secondary">
                <div class="secondary-left flex-row flex-left">
                    <Button v-for="view in secondaryRoutes" :key="view.path" :to="view.path">
                        {{ view.meta.title ?? view.name }}
                    </Button>
                </div>
                <div class="secondary-right flex-row flex-right">
                    <ServerStatus v-if="me.isAuthenticated" />
                    <Button v-if="me.isAuthenticated" class="user" :to="`/profile/${me.userId}`">
                        <div class="flex-row flex-center gap-sm">
                            <Icon :icon="account" :height="20" />
                            <div>{{ me.username }}</div>
                        </div>
                    </Button>
                </div>
            </div>
        </div>

        <TransitionGroup name="slide-right">
            <Messages v-show="messagesOpen" key="messages" v-model="messagesOpen" v-click-away:messages="() => (messagesOpen = false)" />
            <Friends v-show="friendsOpen" key="friends" v-model="friendsOpen" v-click-away:friends="() => (friendsOpen = false)" />
            <Downloads
                v-show="downloadsOpen"
                key="downloads"
                v-model="downloadsOpen"
                v-click-away:downloads="() => (downloadsOpen = false)"
            />
        </TransitionGroup>

        <Exit v-model="exitOpen" />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
import accountMultiple from "@iconify-icons/mdi/account-multiple";
import messageIcon from "@iconify-icons/mdi/chat";
import closeThick from "@iconify-icons/mdi/close-thick";
import windowMinimize from "@iconify-icons/mdi/window-minimize";
import fullscreen from "@iconify-icons/mdi/fullscreen";
import fullscreenExit from "@iconify-icons/mdi/fullscreen-exit";

import cog from "@iconify-icons/mdi/cog";
import { computed, inject, Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

import Button from "@renderer/components/controls/Button.vue";
import Downloads from "@renderer/components/navbar/Downloads.vue";
import DownloadsButton from "@renderer/components/navbar/DownloadsButton.vue";
import Exit from "@renderer/components/navbar/Exit.vue";
import Friends from "@renderer/components/navbar/Friends.vue";
import Messages from "@renderer/components/navbar/Messages.vue";
import { useRouter } from "vue-router";
import { settingsStore } from "@renderer/store/settings.store";
import { me } from "@renderer/store/me.store";
import ServerStatus from "@renderer/components/navbar/ServerStatus.vue";

defineProps<{
    hidden?: boolean;
}>();

const router = useRouter();
const allRoutes = router.getRoutes();
const primaryRoutes = computed(() => {
    return allRoutes
        .filter((r) => ["/play", "/watch", "/news", "/library"].includes(r.path))
        .filter(
            (r) =>
                (r.meta.hide === false || r.meta.hide === undefined) &&
                ((r.meta.devOnly && settingsStore.devMode) || !r.meta.devOnly) &&
                ((r.meta.onlineOnly && me.isAuthenticated) || !r.meta.onlineOnly)
        )
        .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));
});
const secondaryRoutes = computed(() => {
    return allRoutes
        .filter((r) => r.path.startsWith(`/${router.currentRoute.value.path.split("/")[1]}/`))
        .filter(
            (r) =>
                (r.meta.hide === false || r.meta.hide === undefined) &&
                ((r.meta.devOnly && settingsStore.devMode) || !r.meta.devOnly) &&
                ((r.meta.onlineOnly && me.isAuthenticated) || !r.meta.onlineOnly)
        )
        .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));
});
const messagesOpen = ref(false);
const friendsOpen = ref(false);
const downloadsOpen = ref(false);
const settingsOpen = inject<Ref<boolean>>("settingsOpen")!;
const exitOpen = inject<Ref<boolean>>("exitOpen")!;

const messagesUnread = computed(() => {
    //TODO dmStores
    // for (const [, messages] of api.session.directMessages) {
    //     for (const message of messages) {
    //         if (!message.read) {
    //             return true;
    //         }
    //     }
    // }
    return false;
});

function minimizeWindow() {
    window.mainWindow?.minimize();
}

function toggleFullscreen() {
    settingsStore.fullscreen = !settingsStore.fullscreen;
}
</script>

<style lang="scss" scoped>
.nav {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    backdrop-filter: blur(5px);
    background: linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.9));
    box-shadow:
        0 1px 0 rgba(0, 0, 0, 0.4),
        0 3px 5px rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    gap: 1px;
    transition:
        transform 0.3s,
        opacity 0.3s;
    z-index: 2;
    font-family: Rajdhani, sans-serif;
    &.hidden {
        opacity: 0;
        transform: translateY(-100%);
    }
    &:before {
        @extend .fullsize;
        left: 0;
        top: 0;
        content: "";
        z-index: -1;
        opacity: 0.2;
        background-image: url("/src/renderer/assets/images/squares.png");
    }
}
.logo {
    flex-direction: column;
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
}
.primary {
    min-height: 60px;
}
.primary,
.logo {
    .button {
        font-size: 25px;
        font-weight: 600;
        background: radial-gradient(rgba(73, 49, 49, 0), rgba(255, 255, 255, 0.05));
        color: rgba(255, 255, 255, 0.8);
        box-shadow:
            1px 0 0 rgba(255, 255, 255, 0.05),
            -1px 0 0 rgba(255, 255, 255, 0.05);
        border: none;
        flex-grow: 0;
        height: 100%;
        font-weight: 600;
        text-transform: uppercase;
        max-height: unset;
        :deep(.p-button) {
            padding: 0 22px;
        }
        &.icon {
            :deep(.p-button) {
                padding: 0 14px;
            }
        }
        &:hover,
        &.active {
            background: radial-gradient(rgba(0, 0, 0, 0), rgba(255, 255, 255, 0.15));
            color: #fff;
            text-shadow: 0 0 7px #fff;
            box-shadow:
                1px 0 0 rgba(255, 255, 255, 0.2),
                -1px 0 0 rgba(255, 255, 255, 0.2),
                0 1px 0 rgba(255, 255, 255, 0.2),
                7px -3px 10px rgba(0, 0, 0, 0.5),
                -7px -3px 10px rgba(0, 0, 0, 0.5) !important;
        }
        &.active {
            z-index: 2;
        }
        &:hover {
            z-index: 3;
        }
    }
}
.primary-left,
.primary-right {
    display: flex;
    flex-direction: row;
    gap: 1px;
}
.primary-left {
    box-shadow: 5px 0 20px rgba(0, 0, 0, 0.4);
    &:first-child {
        box-shadow: 1px 0 0 rgba(255, 255, 255, 0.05);
    }
    &:last-child {
        box-shadow:
            -1px 0 0 rgba(255, 255, 255, 0.05),
            1px 0 0 rgba(255, 255, 255, 0.15);
    }
}
.primary-right {
    box-shadow: -5px 0 20px rgba(0, 0, 0, 0.4);
    &:first-child {
        box-shadow:
            1px 0 0 rgba(255, 255, 255, 0.05),
            -1px 0 0 rgba(255, 255, 255, 0.15);
    }
    &:last-child {
        box-shadow: -1px 0 0 rgba(255, 255, 255, 0.05);
    }
}
.secondary {
    flex-direction: row;
    background: linear-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.3));
    width: 100%;
    box-shadow: inset 2px 2px 10px rgba(0, 0, 0, 0.5);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    height: 36px;
    font-size: 18px;
    .button {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        flex-grow: 0;
        :deep(> button) {
            padding: 0 20px;
        }
        &:hover,
        &.active {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
            box-shadow:
                inset 0 2px 10px rgba(0, 0, 0, 0.5),
                0 1px 0 rgba(255, 255, 255, 0.2);
        }
    }
    &-right {
        .button {
            padding: 0;
        }
    }
}
.button.close:hover {
    background: rgba(255, 0, 0, 0.2);
    box-shadow:
        1px 0 0 rgba(255, 47, 47, 0.418),
        -1px 0 0 rgba(255, 47, 47, 0.418),
        0 1px 0 rgba(255, 47, 47, 0.418),
        7px -3px 10px rgba(0, 0, 0, 0.5),
        -7px -3px 10px rgba(0, 0, 0, 0.5) !important;
}
.user {
    text-transform: unset;
}
.unread-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 100%;
    right: 17px;
    bottom: 17px;
    background: red;
}

.drag-window-area {
    flex-grow: 1;
    -webkit-app-region: drag !important;
}
</style>

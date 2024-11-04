<template>
    <div v-if="settingsStore.isInitialized" id="wrapper" class="wrapper fullsize">
        <transition mode="in-out" name="intro">
            <IntroVideo v-if="!settingsStore.skipIntro && videoVisible" @complete="onIntroEnd" />
        </transition>
        <DebugSidebar v-if="settingsStore.devMode" />
        <StickyBattle />
        <Background :blur="blurBg" />
        <Notifications />
        <PromptContainer />
        <NavBar :class="{ hidden: empty || state === 'preloader' || state === 'initial-setup' }" />
        <div class="lobby-version">
            {{ infosStore.lobby.version }}
        </div>
        <div v-if="empty" class="splash-options">
            <div class="option" @click="settingsOpen = true">
                <Icon :icon="cog" height="21" />
            </div>
            <div class="option" @click="exitOpen = true">
                <Icon :icon="closeThick" height="21" />
            </div>
        </div>
        <Transition mode="out-in" name="fade">
            <Preloader v-if="state === 'preloader'" @complete="onPreloadDone" />
            <InitialSetup v-else-if="state === 'initial-setup'" @complete="onInitialSetupDone" />
            <div class="view-container" v-else>
                <RouterView v-slot="{ Component, route }">
                    <template v-if="Component">
                        <Transition v-bind="route.meta.transition" mode="out-in">
                            <KeepAlive>
                                <Suspense suspensible timeout="0">
                                    <component :is="Component" />
                                    <template #fallback>
                                        <Loader />
                                    </template>
                                </Suspense>
                            </KeepAlive>
                        </Transition>
                    </template>
                </RouterView>
            </div>
        </Transition>
        <Settings v-model="settingsOpen" />
        <Error />
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";
import cog from "@iconify-icons/mdi/cog";
import { provide, Ref, toRef, toValue } from "vue";
import { ref } from "vue";
import { useRouter } from "vue-router";

import StickyBattle from "@renderer/components/battle/StickyBattle.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Background from "@renderer/components/misc/Background.vue";
import DebugSidebar from "@renderer/components/misc/DebugSidebar.vue";
import Error from "@renderer/components/misc/Error.vue";
import InitialSetup from "@renderer/components/misc/InitialSetup.vue";
import IntroVideo from "@renderer/components/misc/IntroVideo.vue";
import Preloader from "@renderer/components/misc/Preloader.vue";
import NavBar from "@renderer/components/navbar/NavBar.vue";
import Settings from "@renderer/components/navbar/Settings.vue";
import Notifications from "@renderer/components/notifications/Notifications.vue";
import PromptContainer from "@renderer/components/prompts/PromptContainer.vue";

import { playRandomMusic } from "@renderer/utils/play-random-music";
import { settingsStore } from "./store/settings.store";
import { infosStore } from "@renderer/store/infos.store";

const router = useRouter();
const videoVisible = toRef(!toValue(settingsStore.skipIntro));

const state: Ref<"preloader" | "initial-setup" | "default"> = ref("preloader");
const empty = ref(router.currentRoute.value?.meta?.empty ?? false);
const blurBg = ref(router.currentRoute.value?.meta?.blurBg ?? true);

const settingsOpen = ref(false);
const exitOpen = ref(false);

provide("settingsOpen", settingsOpen);
provide("exitOpen", exitOpen);

const toggleMessages: Ref<((open?: boolean, userId?: number) => void) | undefined> = ref();
provide("toggleMessages", toggleMessages);

const toggleFriends: Ref<((open?: boolean) => void) | undefined> = ref();
provide("toggleFriends", toggleFriends);

const toggleDownloads: Ref<((open?: boolean) => void) | undefined> = ref();
provide("toggleDownloads", toggleDownloads);

playRandomMusic();

const simpleRouterMemory = new Map<string, string>();
router.beforeEach(async (to) => {
    if (to.meta?.redirect) {
        const redirection = simpleRouterMemory.get(to.fullPath.split("/")[1]) ?? to.meta.redirect;
        return {
            path: redirection,
        };
    }
});

router.afterEach(async (to) => {
    simpleRouterMemory.set(to.fullPath.split("/")[1], to.fullPath);
    empty.value = to?.meta?.empty ?? false;
    blurBg.value = to?.meta?.blurBg ?? blurBg.value;
});

function onIntroEnd() {
    videoVisible.value = false;
}

async function onPreloadDone() {
    state.value = "initial-setup";
    // TODO: should also check to see if game and maps are installed (need to fix bug where interrupted game dl reports as successful install)
    const installedEngines = await window.engine.getInstalledVersions();
    console.debug(installedEngines);
    if (installedEngines.length === 0) {
        state.value = "initial-setup";
        return;
    }
    const installedGameVersions = await window.game.getInstalledVersions();
    console.debug(installedGameVersions);
    if (installedGameVersions.length === 0) {
        state.value = "initial-setup";
        return;
    }
    state.value = "default";
}

function onInitialSetupDone() {
    state.value = "default";
    console.debug("Initial setup done");
}
</script>

<style lang="scss" scoped>
.view-container {
    flex: auto;
}

.wrapper {
    overflow: hidden;
}

.lobby-version {
    position: absolute;
    left: 3px;
    bottom: 1px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
}
.splash-options {
    position: fixed;
    display: flex;
    flex-direction: row;
    gap: 5px;
    right: 0;
    top: 0;
    padding: 10px;
    z-index: 5;
    .option {
        opacity: 0.8;
        &:hover {
            opacity: 1;
        }
    }
}
</style>

<template>
    <div id="wrapper" class="wrapper fullsize" @click.left="leftClick" @click.right="rightClick">
        <transition mode="in-out" name="intro">
            <IntroVideo v-if="!skipIntro && videoVisible" @complete="onIntroEnd" />
        </transition>
        <DebugSidebar v-if="settings.devMode" />
        <StickyBattle />
        <Background :blur="blurBg" />
        <Notifications />
        <PromptContainer />
        <div class="lobby-version">
            {{ lobbyVersion }}
        </div>
        <div v-if="empty" class="splash-options">
            <div class="option" @click="settingsOpen = true">
                <Icon :icon="cog" height="21" />
            </div>
            <div class="option" @click="exitOpen = true">
                <Icon :icon="closeThick" height="21" />
            </div>
        </div>
        <transition mode="out-in" name="fade">
            <Preloader v-if="state === 'preloader'" @complete="onPreloadDone" />
            <InitialSetup v-else-if="state === 'initial-setup'" @complete="onInitialSetupDone" />
            <div v-else class="fullsize">
                <NavBar :class="{ hidden: empty }" />
                <div :class="`relative view view--${$router.currentRoute.value.name?.toString()}`">
                    <MatchmakingQueueStatus />
                    <Panel :empty="empty" class="flex-grow">
                        <Breadcrumbs :class="{ hidden: empty }" />
                        <router-view v-slot="{ Component, route }">
                            <transition name="slide-left" mode="out-in">
                                <!--mode= "out-in" causes bug see https://github.com/beyond-all-reason/bar-lobby/issues/61 add back in once vue fixes underlining issue-->
                                <template v-if="Component">
                                    <suspense timeout="0">
                                        <component :is="Component" :key="route.path" />
                                        <template #fallback>
                                            <Loader />
                                        </template>
                                    </suspense>
                                </template>
                            </transition>
                        </router-view>
                    </Panel>
                </div>
            </div>
        </transition>
    </div>
    <Settings v-model="settingsOpen" />
    <Error />
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";
import cog from "@iconify-icons/mdi/cog";
import { computed, provide, Ref } from "vue";
import { ref } from "vue";
import { useRouter } from "vue-router/auto";

import StickyBattle from "@/components/battle/StickyBattle.vue";
import Loader from "@/components/common/Loader.vue";
import Panel from "@/components/common/Panel.vue";
import Background from "@/components/misc/Background.vue";
import DebugSidebar from "@/components/misc/DebugSidebar.vue";
import Error from "@/components/misc/Error.vue";
import InitialSetup from "@/components/misc/InitialSetup.vue";
import IntroVideo from "@/components/misc/IntroVideo.vue";
import MatchmakingQueueStatus from "@/components/misc/MatchmakingQueueStatus.vue";
import Preloader from "@/components/misc/Preloader.vue";
import Breadcrumbs from "@/components/navbar/Breadcrumbs.vue";
import NavBar from "@/components/navbar/NavBar.vue";
import Settings from "@/components/navbar/Settings.vue";
import Notifications from "@/components/notifications/Notifications.vue";
import PromptContainer from "@/components/prompts/PromptContainer.vue";
import { defaultMaps } from "@/config/default-maps";
import { defaultEngineVersion, defaultGameVersion } from "@/config/default-versions";
import { playRandomMusic } from "@/utils/play-random-music";

const router = useRouter();
const settings = api.settings.model;
const skipIntro = settings.skipIntro;
const videoVisible = ref(!settings.skipIntro);
const state: Ref<"preloader" | "initial-setup" | "default"> = ref("preloader");
const empty = ref(api.router.currentRoute.value.meta.empty ?? false);
const blurBg = ref(true);
const lobbyVersion = api.info.lobby.version;
const viewOverflowY = computed(() => (router.currentRoute.value.meta.overflowY ? router.currentRoute.value.meta.overflowY : "auto"));

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

router.afterEach(async (to, from) => {
    empty.value = to?.meta?.empty ?? false;
    blurBg.value = to?.meta?.blurBg ?? blurBg.value;
});

function onIntroEnd() {
    videoVisible.value = false;
}

async function onPreloadDone() {
    // TODO: should also check to see if game and maps are installed (need to fix bug where interrupted game dl reports as successful install)
    if (api.content.engine.installedVersions.length === 0) {
        state.value = "initial-setup";
    } else {
        // TODO: fix the slight delay these cause on startup, probably best to move them into worker threads
        api.content.engine.downloadEngine(defaultEngineVersion);
        api.content.game.downloadGame(defaultGameVersion);
        api.content.maps.downloadMaps(defaultMaps);

        state.value = "default";
    }
}

function onInitialSetupDone() {
    state.value = "default";
}

function leftClick() {
    return api.utils.onLeftClick.dispatch();
}
function rightClick() {
    return api.utils.onRightClick.dispatch();
}
</script>

<style lang="scss" scoped>
.wrapper {
    overflow: hidden;
}
.view {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    overflow: hidden;
}
:deep(.view > .panel) {
    overflow-y: v-bind(viewOverflowY);
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

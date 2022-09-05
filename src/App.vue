<template>
    <div id="wrapper" class="wrapper fullsize" @click.left="leftClick" @click.right="rightClick">
        <transition mode="in-out" name="intro">
            <IntroVideo v-if="!skipIntro && videoVisible" @complete="onIntroEnd" />
        </transition>
        <DebugSidebar v-if="!isProduction" />
        <StickyBattle />
        <Background :blur="blurBg" />
        <Alerts />
        <div class="lobby-version">
            {{ lobbyVersion }}
        </div>
        <div class="steam-overlay-hack">
            {{ frameCount }}
        </div>
        <transition mode="out-in" name="fade">
            <Preloader v-if="state === 'preloader'" @complete="onPreloadDone" />
            <InitialSetup v-else-if="state === 'initial-setup'" @complete="onInitialSetupDone" />
            <div v-else class="fullsize">
                <NavBar :class="{ hidden: empty }" />
                <div :class="`view view--${route.name?.toString()}`">
                    <Panel :class="{ hidden: empty }">
                        <router-view v-slot="{ Component }">
                            <template v-if="Component">
                                <transition mode="out-in" name="slide-left">
                                    <suspense timeout="0">
                                        <component :is="Component" />
                                        <template #fallback>
                                            <Loader />
                                        </template>
                                    </suspense>
                                </transition>
                            </template>
                        </router-view>
                    </Panel>
                </div>
            </div>
        </transition>
    </div>
    <Error />
</template>

<script lang="ts" setup>
import { Ref } from "vue";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import Alerts from "@/components/alerts/Alerts.vue";
import StickyBattle from "@/components/battle/StickyBattle.vue";
import Loader from "@/components/common/Loader.vue";
import Panel from "@/components/common/Panel.vue";
import Background from "@/components/misc/Background.vue";
import DebugSidebar from "@/components/misc/DebugSidebar.vue";
import Error from "@/components/misc/Error.vue";
import InitialSetup from "@/components/misc/InitialSetup.vue";
import IntroVideo from "@/components/misc/IntroVideo.vue";
import Preloader from "@/components/misc/Preloader.vue";
import NavBar from "@/components/navbar/NavBar.vue";
import { defaultMaps } from "@/config/default-maps";
import { playRandomMusic } from "@/utils/play-random-music";

const isProduction = process.env.NODE_ENV === "production";

const router = useRouter();
const route = useRoute();
const skipIntro = api.settings.model.skipIntro;
const videoVisible = ref(!api.settings.model.skipIntro.value);
const state: Ref<"preloader" | "initial-setup" | "default"> = ref("preloader");
const empty = ref(false);
const blurBg = ref(true);
const lobbyVersion = api.info.lobby.version;

playRandomMusic();

router.afterEach(async (to, from) => {
    empty.value = route?.meta?.empty ?? false;
    blurBg.value = route?.meta?.blurBg ?? blurBg.value;
});

const onIntroEnd = () => {
    videoVisible.value = false;
};

const onPreloadDone = async () => {
    console.time("onPreloadDone");

    // TODO: init all content apis in api.content.init()

    await api.content.engine.init();

    // TODO: should also check to see if game and maps are installed (need to fix bug where interrupted game dl reports as successful install)
    if (api.content.engine.installedVersions.length === 0) {
        state.value = "initial-setup";
    } else {
        await api.content.game.init();

        await api.content.maps.init();

        await api.content.replays.init();

        // TODO: fix the slight delay these cause on startup, probably best to move them into worker threads
        api.content.engine.downloadLatestEngine();
        api.content.game.downloadGame();
        api.content.maps.installMaps(defaultMaps);

        state.value = "default";
    }

    console.timeEnd("onPreloadDone");
};

const onInitialSetupDone = () => {
    playRandomMusic();

    state.value = "default";
};

router.replace("/");

const leftClick = () => api.utils.onLeftClick.dispatch();
const rightClick = () => api.utils.onRightClick.dispatch();

const frameCount = ref(0);

const animFrame = () => {
    frameCount.value++;
    requestAnimationFrame(() => animFrame());
};
animFrame();
</script>

<style lang="scss" scoped>
.view {
    overflow-y: hidden;
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
}
.lobby-version {
    position: absolute;
    left: 3px;
    bottom: 1px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
}
.steam-overlay-hack {
    opacity: 0.01;
}
</style>

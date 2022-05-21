<template>
    <div id="wrapper" class="wrapper fullsize" @click.left="leftClick" @click.right="rightClick">
        <DebugSidebar v-if="!isProduction" />
        <StatusInfo v-if="false" />
        <Background :blur="blurBg" />
        <transition mode="out-in" name="fade">
            <IntroVideo v-if="state === 'intro'" @complete="onIntroEnd" />
            <Preloader v-else-if="state === 'preloader'" @complete="onPreloadDone" />
            <InitialSetup v-else-if="state === 'initial-setup'" @complete="onInitialSetupDone" />
            <div v-else class="fullsize">
                <NavBar :class="{ hidden: empty }" />
                <div :class="`view view--${routeKey}`">
                    <Panel :class="{ hidden: empty }">
                        <router-view v-slot="{ Component }">
                            <transition mode="out-in" v-bind="currentTransition" :style="`--enter-duration: ${transitionDurationEnterMs}ms; --leave-duration: ${transitionDurationLeaveMs}ms;`" @after-leave="transitionAfterLeave" @enter="transitionEnter">
                                <component :is="Component" />
                            </transition>
                        </router-view>
                    </Panel>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import * as path from "path";
import { Ref, TransitionProps } from "vue";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import DebugSidebar from "@/components/misc/DebugSidebar.vue";
import NavBar from "@/components/misc/NavBar.vue";
import Preloader from "@/components/misc/Preloader.vue";
import Background from "@/components/misc/Background.vue";
import { playRandomMusic } from "@/utils/play-random-music";
import IntroVideo from "@/components/misc/IntroVideo.vue";
import Panel from "@/components/common/Panel.vue";
import StatusInfo from "./components/battle/StatusInfo.vue";
import InitialSetup from "@/components/misc/InitialSetup.vue";
import { lastInArray } from "jaz-ts-utils";
import { defaultMaps } from "@/config/default-maps";

const isProduction = process.env.NODE_ENV === "production";

const router = useRouter();
const route = useRoute();
const routeKey = ref("");
const state: Ref<"intro" | "preloader" | "initial-setup" | "default"> = ref(api.settings.model.skipIntro.value ? "preloader" : "intro");
const empty = ref(false);
const blurBg = ref(true);

const currentTransition: Ref<TransitionProps> = ref({});
const nextTransition : Ref<TransitionProps> = ref({});
const transitionDurationEnterMs = ref(0);
const transitionDurationLeaveMs = ref(0);

router.afterEach(async (to, from) => {
    currentTransition.value = route.redirectedFrom?.meta.transition ?? from?.meta?.transition ?? {};
    nextTransition.value = to?.meta?.transition ?? {};

    setTransitionDuration(currentTransition.value);

    empty.value = route?.meta?.empty ?? false;
    blurBg.value = route?.meta?.blurBg ?? blurBg.value;
});

const transitionAfterLeave = () => {
    currentTransition.value = nextTransition.value;

    setTransitionDuration(currentTransition.value);
};

const transitionEnter = () => {
    routeKey.value = route.name?.toString() ?? "";
};

const setTransitionDuration = (transition: TransitionProps) => {
    if (transition.duration) {
        if (typeof transition.duration === "number") {
            transitionDurationEnterMs.value = transition.duration;
            transitionDurationLeaveMs.value = transition.duration;
        } else {
            transitionDurationEnterMs.value = transition.duration.enter;
            transitionDurationLeaveMs.value = transition.duration.leave;
        }
    } else {
        transitionDurationEnterMs.value = 100;
        transitionDurationLeaveMs.value = 100;
    }
};

const onIntroEnd = () => {
    state.value = "preloader";
};

const onPreloadDone = async () => {
    await api.content.engine.init();

    if (api.content.engine.installedVersions.length === 0) {
        state.value = "initial-setup";
    } else {
        await api.content.engine.init();

        const latestEngine = lastInArray(api.content.engine.installedVersions)!;
        const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
        const prBinaryPath = path.join(api.settings.model.dataDir.value, "engine", latestEngine, binaryName);
        await api.content.game.init(prBinaryPath);

        await api.content.maps.init();

        api.content.engine.downloadLatestEngine();
        api.content.game.updateGame();
        api.content.maps.downloadMaps(defaultMaps);

        state.value = "default";

        playRandomMusic();
    }
};

const onInitialSetupDone = () => {
    state.value = "default";
    playRandomMusic();
};

router.replace("/");

const leftClick = () => api.session.onLeftClick.dispatch();
const rightClick = () => api.session.onRightClick.dispatch();
</script>

<style lang="scss" scoped>
.view {
    overflow-y: hidden;
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    & > .panel {
        & > .content {
            padding: 20px;
        }
    }
    h1 {
        position: relative;
        text-transform: uppercase;
        font-weight: 500;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        letter-spacing: -2px;
    }
}
</style>
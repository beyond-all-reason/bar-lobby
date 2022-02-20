<template>
    <div :class="`fullsize theme theme--${theme.toLowerCase()}`">
        <DebugSidebar />
        <Background :blur="blurBg" />
        <IntroVideo v-if="state === 'intro'" @end="state = 'preloader'" />
        <Preloader v-else-if="state === 'preloader'" @loaded="state = 'default'" />
        <template v-else>
            <Alert />
            <Settings />
            <Exit />
            <NavBar :class="{ hidden: empty }" />
            <div :class="`view view--${route.name?.toString()}`">
                <Panel padding="20px 20px 20px 20px" :class="{ hidden: empty }">
                    <router-view v-slot="{ Component }">
                        <transition mode="out-in" v-bind="currentTransition" @after-leave="afterLeave" :style="`--enter-duration: ${transitionDurationEnterMs}ms; --leave-duration: ${transitionDurationLeaveMs}ms;`">
                            <component :is="Component" />
                        </transition>
                    </router-view>
                </Panel>
            </div>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref, TransitionProps } from "vue";
import { useRouter, useRoute } from "vue-router";
import Alert from "@/components/Alert.vue";
import DebugSidebar from "@/components/DebugSidebar.vue";
import Settings from "@/components/Settings.vue";
import Exit from "@/components/Exit.vue";
import NavBar from "@/components/NavBar.vue";
import Panel from "@/components/common/Panel.vue";
import Preloader from "@/components/Preloader.vue";
import Background from "@/components/Background.vue";
import { playRandomMusic } from "@/utils/play-random-music";
import IntroVideo from "@/components/IntroVideo.vue";

const isProduction = process.env.NODE_ENV === "production";

const router = useRouter();
const route = useRoute();
const state: Ref<"intro" | "preloader" | "default"> = ref(window.api.settings.model.skipIntro.value || !isProduction ? "preloader" : "intro");
const theme = window.api.settings.model.theme;
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

const afterLeave = () => {
    currentTransition.value = nextTransition.value;

    setTransitionDuration(currentTransition.value);
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

playRandomMusic();

router.replace("/");
</script>
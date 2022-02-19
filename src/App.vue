<template>
    <div :class="`fullsize theme theme--${theme.toLowerCase()}`">
        <Alert />
        <DebugSidebar />
        <Preloader v-if="!ready" @loaded="ready = true" />
        <div v-else class="fullsize layout layout--default">
            <div class="fullsize background-overlay" :class="{ active: true }"></div>
            <Settings />
            <Exit />
            <NavBar />
            <div :class="`view view--${route.name?.toString()}`">
                <Panel padding="20px 20px 20px 20px" :empty="empty">
                    <router-view v-slot="{ Component }">
                        <transition :name="transitionName" :mode="transitionMode" :appear="transitionAppear" :duration="transitionDuration">
                            <component :is="Component" />
                        </transition>
                    </router-view>
                </Panel>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import Alert from "@/components/Alert.vue";
import DebugSidebar from "@/components/DebugSidebar.vue";
import Settings from "@/components/Settings.vue";
import Exit from "@/components/Exit.vue";
import NavBar from "@/components/NavBar.vue";
import Panel from "@/components/common/Panel.vue";
import Preloader from "@/components/Preloader.vue";

const router = useRouter();
const route = useRoute();
const theme = window.api.settings.model.theme;
const empty = ref(false);
const ready = ref(false);

const transitionName: Ref<string | undefined> = ref(undefined);
const transitionMode: Ref<"default" | "in-out" | "out-in" | undefined> = ref(undefined);
const transitionAppear: Ref<boolean | undefined> = ref(undefined);
const transitionDuration: Ref<number | undefined> = ref(undefined);

router.afterEach((to, from) => {
    transitionName.value = route?.meta?.transition?.name ?? route.redirectedFrom?.meta?.transition?.name ?? "secondary";
    transitionMode.value = route?.meta?.transition?.mode ?? "out-in";
    transitionAppear.value = route?.meta?.transition?.appear ?? true;
    transitionDuration.value = route?.meta?.transition?.duration ?? undefined;
});
</script>
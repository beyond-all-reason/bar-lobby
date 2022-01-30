<template>
    <div class="fullsize layout layout--default">
        <div class="fullsize background-overlay" :class="{ active: blurBg }"></div>
        <Settings v-if="!empty" />
        <Exit v-if="!empty" />
        <NavBar v-if="!empty" />
        <div :class="`view view--${route.name?.toString()}`">
            <Panel padding="15px 30px 30px 30px" :empty="empty">
                <router-view v-slot="{ Component }">
                    <transition :name="transitionName" :mode="transitionMode" :appear="transitionAppear ?? Boolean(transitionName)" :duration="transitionDuration">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </Panel>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * Was using multiple layouts but changing between them seems to cause components to get executed twice,
 * not a huge deal but seems cleaner to just have one layout
 */

import { PropType, ref, watch, BaseTransitionProps, defineProps } from "vue";
import { useRoute } from "vue-router";
import Settings from "@/components/Settings.vue";
import Exit from "@/components/Exit.vue";
import NavBar from "@/components/NavBar.vue";
import Panel from "@/components/common/Panel.vue";

const props = defineProps({
    empty: Boolean,
    transitionName: String,
    transitionAppear: Boolean,
    transitionMode: {
        type: String as PropType<BaseTransitionProps["mode"]>,
        default: "out-in"
    },
    transitionDuration: Number,
    blurBg: Boolean
});

const route = useRoute();
const transitionName = ref("");

watch(route, () => {
    transitionName.value = props.transitionName ?? route.redirectedFrom?.meta?.transition ?? "secondary";
});
</script>
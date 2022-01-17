<template>
    <div :class="`fullsize layout layout--default`">
        <Settings v-if="!empty" />
        <Exit v-if="!empty" />
        <NavBar v-if="!empty" />
        <div :class="`view view--${route.name?.toString()}`">
            <Panel padding="15px 30px 30px 30px" :empty="empty">
                <router-view v-slot="{ Component }">
                    <transition :name="transitionName" mode="out-in" :appear="appear ?? Boolean(transition)">
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

import { ref, watch } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
    transition: String,
    appear: Boolean,
    empty: Boolean
});

const route = useRoute();
const transitionName = ref("");

watch(route, () => {
    transitionName.value = route.redirectedFrom?.meta?.transition ?? "secondary";
});
</script>
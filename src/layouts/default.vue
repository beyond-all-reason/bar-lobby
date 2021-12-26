<template>
    <div :class="`fullsize layout layout--default`">
        <Settings />
        <Exit />
        <NavBar />
        <div :class="`view view--${route.name?.toString()}`">
            <Panel>
                <router-view v-slot="{ Component }">
                    <transition :name="transitionName" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </Panel>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
    transition: String
});

const route = useRoute();
const transitionName = ref("");

watch(route, () => {
    transitionName.value = route.redirectedFrom?.meta?.transition ?? "secondary";
});
</script>
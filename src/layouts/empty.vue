<template>
    <div class="fullsize layout layout--empty">
        <div id="view" :class="`view view--${route.name?.toString()}`">
            <router-view v-slot="{ Component }">
                <transition :name="transition" :appear="appear ?? Boolean(transition)">
                    <component :is="Component" />
                </transition>
            </router-view>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const props = defineProps({
    transition: String,
    appear: Boolean
});

const route = useRoute();
</script>


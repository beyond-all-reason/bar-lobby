<template>
    <div :class="`fullsize layout--default`">
        <NavBar />
        <div :class="`view view--${route.name?.toString()}`">
            <router-view v-slot="{ Component }">
                <transition :name="transition" :appear="Boolean(transition)">
                    <component :is="Component" />
                </transition>
            </router-view>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
    props: {
        transition: {
            type: String,
            default: "fade"
        }
    },
    setup() {
        const route = useRoute();

        return { route };
    }
});
</script>

<style lang="scss" scoped>
.layout--default {
    &:before {
        @extend .fullsize;
        z-index: -1;
        background-size: cover;
        background-position: center;
    }
}
.view {
    overflow-y: hidden;
    padding: 20px;
}
</style>

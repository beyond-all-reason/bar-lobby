<template>
    <div class="fullsize layout layout--default">
        <div class="fullsize background"></div>
        <div class="container">
            <NavBar />
            <router-view v-slot="{ Component }">
                <transition :name="transition" :appear="Boolean(transition)">
                    <div :class="`view view--${routeName}`">
                        <component :is="Component" />
                    </div>
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
            default: ""
        }
    },
    setup() {
        const route = useRoute();
        const routeName = route.name?.toString();

        return { routeName };
    }
});
</script>

<style lang="scss" scoped>
.background {
    z-index: -1;
    transform: scale(1.2) translateX(-15px);
    background-size: cover;
    filter: blur(6px) saturate(60%) brightness(30%);
    background: #111;
}
.container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    max-height: 100%;
}
.main {
    padding: 10px;
    flex-grow: 1;
    height: 0;
}
.view {
    overflow-y: hidden;
}
</style>

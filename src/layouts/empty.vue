<template>
    <div :class="`fullsize layout--empty view--${route.name?.toString()}`">
        <router-view v-slot="{ Component }">
            <transition :name="transition" :appear="Boolean(transition)">
                <component :is="Component" />
            </transition>
        </router-view>
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

        return { route };
    }
});
</script>

<style scoped lang="scss">
</style>
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

<script lang="ts">
import { defineComponent } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
    props: {
        transition: String,
        appear: Boolean
    },
    setup() {
        const route = useRoute();

        return { route };
    }
});
</script>


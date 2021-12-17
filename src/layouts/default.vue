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

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
    props: {
        transition: String
    },
    setup(props) {
        const route = useRoute();
        const transitionName = ref("");

        watch(route, () => {
            transitionName.value = route.redirectedFrom?.meta?.transition ?? "secondary";
            console.log(transitionName.value);
        });

        return { route, transitionName };
    }
});
</script>
<template>
    <router-link v-if="to" @mouseenter="play" :to="to" class="btn" :class="{ active: isActive }">
        <div class="content">
            <slot />
        </div>
    </router-link>
    <button v-else class="btn" @mouseenter="play">
        <div class="content">
            <slot />
        </div>
    </button>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
    props: {
        to: String
    },
    setup(props) {
        const route = useRoute();
        const to = toRefs(props).to;
        const isActive = computed(() => props.to && route.path.includes(props.to));
        const clickSound = window.api.audio.sfxSounds.get("button-hover")!;
        const play = () => {
            if (!props.to || (props.to && !isActive.value)) {
                clickSound.play();
            }
        };

        return { route, to, play, isActive };
    }
});
</script>

<style scoped lang="scss">
.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
</style>
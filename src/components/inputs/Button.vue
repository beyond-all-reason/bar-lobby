<template>
    <router-link v-if="to" class="btn" @mouseover="play" :to="to">
        <div class="content">
            <slot />
        </div>
    </router-link>
    <button v-else class="btn" @mouseover="play">
        <div class="content">
            <slot />
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, toRefs } from "vue";
import { useSound } from "@vueuse/sound";
import buttonSfx from "@/assets/audio/ui/button-hover.mp3";

export default defineComponent({
    props: {
        to: String
    },
    setup(props) {
        const { play } = useSound(buttonSfx, { volume: 0.2 });
        const to = toRefs(props).to;

        return { play, to };
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
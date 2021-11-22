<template>
    <router-link class="btn" @mouseover="play" to="">
        <div class="content">
            <slot />
        </div>
    </router-link>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useSound } from "@vueuse/sound";
import buttonSfx from "@/assets/audio/ui/button-hover.mp3";

export default defineComponent({
    props: {
    },
    setup(props) {
        const { play } = useSound(buttonSfx, { volume: 0.2 });

        return { play };
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
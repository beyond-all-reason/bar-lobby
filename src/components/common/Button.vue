<template>
    <router-link :class="`${depress ? 'depress' : ''} ${isSelected ? 'selected' : ''}`" @mouseover="() => !isSelected && play()" :to="to">
        <div class="content">
            <slot/>
        </div>
    </router-link>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useSound } from "@vueuse/sound";
import buttonSfx from "@/assets/audio/ui/button-hover.mp3";

export default defineComponent({
    props: {
        selected: {
            type: Boolean,
            default: false
        },
        depress: {
            type: Boolean,
            default: false
        },
        to: {
            type: String,
            default: ""
        }
    },
    setup(props) {
        const isSelected = ref(props.selected);
        const to = ref(props.to);
        const { play } = useSound(buttonSfx, { volume: 0.2 });

        return { isSelected, play, to };
    }
});
</script>

<style scoped lang="scss">
.content {
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(0);
    transition: transform 0.1s;
}
a {
    &.depress:hover:not(.selected) .content {
        transform: translateY(-1px);
    }
    &.depress:active:not(.selected) .content {
        transform: translateY(2px);
    }
}
</style>
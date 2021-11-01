<template>
    <button :class="`${depress ? 'depress' : ''} ${isSelected ? 'selected' : ''}`" @mouseover="() => !isSelected && play()">
        <div class="content">
            <slot/>
        </div>
    </button>
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
        }
    },
    setup(props) {
        const isSelected = ref(props.selected);
        const { play } = useSound(buttonSfx, { volume: 0.2 });

        return { isSelected, play };
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
button {
    &.depress:hover:not(.selected) .content {
        transform: translateY(-1px);
    }
    &.depress:active:not(.selected) .content {
        transform: translateY(2px);
    }
}
</style>
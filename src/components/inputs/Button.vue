<template>
    <router-link v-if="to" class="btn" @mouseenter="play" :to="to">
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
import { defineComponent, toRefs } from "vue";

export default defineComponent({
    props: {
        to: String
    },
    setup(props) {
        const to = toRefs(props).to;
        const play = window.api.audio.getSfxPlay("button-hover");

        return { to, play };
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
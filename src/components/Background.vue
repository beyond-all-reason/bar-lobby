<template>
    <div class="background" :style="`background-image: url(${src})`"></div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from "vue";

export default defineComponent({
    props: {
        src: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const { src } = toRefs(props);

        return { src };
    }
});
</script>

<style scoped lang="scss">
.background {
    @extend .fullsize;
    z-index: -1;
    transform: scale(1.2) translateX(-15px);
    background-size: cover;
    filter: blur(6px) saturate(60%) brightness(30%);
}
</style>

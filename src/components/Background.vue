<template>
    <div ref="background" class="background" :style="`background-image: url(${src})`"></div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    props: {
        src: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const src = ref(props.src);

        return { src };
    }
});
</script>

<style scoped lang="scss">
.background {
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: -1;
    transform: scale(1.2) translateX(-15px);
    //background-image: url("~@/assets/images/bg1.jpg");
    background-size: cover;
    filter: blur(6px) saturate(60%) brightness(30%);
}
</style>

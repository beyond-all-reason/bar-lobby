<template>
    <div ref="background" class="background"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
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
    background-image: url("~@/assets/images/bg1.jpg");
    background-size: cover;
    filter: blur(6px) saturate(60%) brightness(40%);
}
</style>

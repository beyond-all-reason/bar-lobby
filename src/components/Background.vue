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
    transform: scale(1.2);
    background-image: url("~@/assets/images/bg1.jpg");
    background-size: cover;
    animation: xAxisSway 5s infinite, yAxisSway 7s infinite, filter 9s infinite;
    animation-direction: alternate;
    animation-timing-function: ease-in-out;
}
@keyframes xAxisSway {
  from { background-position-x: 20px }
  to { background-position-x: 40px }
}
@keyframes yAxisSway {
  from { background-position-y: 20px }
  to { background-position-y: 30px }
}
@keyframes filter {
    from { filter: blur(6px) saturate(60%) brightness(40%); }
    to { filter: blur(6px) saturate(85%) brightness(55%); }
}
</style>

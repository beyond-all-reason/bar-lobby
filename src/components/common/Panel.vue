<template>
    <div class="panel" :style="style">
        <div class="background"></div>
        <slot/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        style: {
            type: String,
            default: "padding: 10px",
        },
    },
    setup(props) {
        return {
            padding: props.style,
        };
    }
});
</script>

<style scoped lang="scss">
.panel {
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}
.background {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: -1;
    backdrop-filter: blur(7px);
    &:after {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        content: "";
        background: url("~@/assets/images/px_by_Gre3g.png");
        filter: brightness(70%);
        opacity: 0.25;
    }
}
</style>
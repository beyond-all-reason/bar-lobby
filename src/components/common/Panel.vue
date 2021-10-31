<template>
    <div class="panel" :style="style">
        <div class="background"></div>
        <div v-if="title" class="title">{{ title }}</div>
        <div class="content">
            <slot />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    props: {
        style: {
            type: String,
            default: "padding: 15px",
        },
        title: {
            type: String,
            default: "",
        },
    },
    setup(props) {
        const style = ref(props.style);
        const title = ref(props.title);

        return {
            style,
            title
        };
    }
});
</script>

<style scoped lang="scss">
.panel {
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.08);
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
.title {
    position: absolute;
    top: 0;
    left: 0;
    padding: 2px 5px;
    background: rgba(0, 0, 0, 0.4);
    color: rgba(255, 255, 255, 0.7);
    + .content {
        padding-top: 20px;
    }
}
</style>
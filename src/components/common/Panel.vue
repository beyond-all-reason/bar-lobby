<template>
    <div class="panel">
        <slot />
    </div>
</template>

<script lang="ts">
import {  defineComponent } from "vue";

export default defineComponent({
    setup() {
        return { };
    }
});
</script>

<style scoped lang="scss">
.panel {
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    max-height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(7px);
    padding: 10px;
    &:before {
        @extend .fullsize;
        background: url("~@/assets/images/px_by_Gre3g.png");
        filter: brightness(70%);
        opacity: 0.25;
    }
}
</style>
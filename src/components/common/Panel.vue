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
    max-height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}
</style>
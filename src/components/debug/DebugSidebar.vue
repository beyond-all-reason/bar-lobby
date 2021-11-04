<template>
    <div class="debug-sidebar">
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        return {};
    }
});
</script>

<style scoped lang="scss">
.debug-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 300px;
    height: 100%;
    background: red;
}
</style>
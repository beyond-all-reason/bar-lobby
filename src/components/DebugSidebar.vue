<template>
    <div class="debug-sidebar active">
        <select v-model="selectedScreen">
            <option v-for="(screenId, index) in screenIds" :key="screenId" :value="index">
                Screen {{ index + 1 }}
            </option>
        </select>
    </div>
</template>

<script lang="ts">
import { defineComponent, readonly, ref } from "vue";

export default defineComponent({
    async setup() {
        const hardwareInfo = await window.getHardwareInfo();
        const screenIds = readonly(hardwareInfo.screenIds);
        const selectedScreen = ref(0);

        return { screenIds, selectedScreen };
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
    z-index: 10;
    background: #111;
    border-right: 1px solid #222;
    box-shadow: 5px 0 5px rgba(0, 0, 0, 0.5);
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    &.active {
        transform: translateX(0);
    }
}
</style>
<template>
    <div>
        Settings

        <select v-model="selectedScreen">
            <option v-for="(screenId, index) in screenIds" :key="screenId" :value="index">
                Screen {{ index + 1 }}
            </option>
        </select>
    </div>
</template>

<script lang="ts">
import { defineComponent, effectScope, ref, watch } from "vue";

export default defineComponent({
    setup() {
        const scope = effectScope();

        const screenIds = ref([0]);
        const selectedScreen = ref(0);

        window.getHardwareInfo().then((hardwareInfo) => {
            screenIds.value = hardwareInfo.screenIds;
        });

        scope.run(() => {
            watch(selectedScreen, (selectedScreen) => {
                window.setDisplay(selectedScreen);
            });
        });

        return { screenIds, selectedScreen };
    }
});
</script>

<style scoped lang="scss">
</style>
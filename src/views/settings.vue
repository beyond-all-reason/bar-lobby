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
    async setup() {
        // const scope = effectScope();

        console.log(this);

        const screenIds = ref([]);
        const selectedScreen = ref(0);

        const hardwareInfo = await window.ipcRenderer.invoke("get-hardware-info");
        screenIds.value = hardwareInfo.screenIds;

        //const window = BrowserWindow.getFocusedWindow();
        //console.log(test);

        // window.getHardwareInfo().then((hardwareInfo) => {
        //     screenIds.value = hardwareInfo.screenIds;
        // });

        // scope.run(() => {
        //     watch(selectedScreen, (selectedScreen) => {
        //         window.setDisplay(selectedScreen);
        //     });
        // });

        return { screenIds, selectedScreen };
    }
});
</script>

<style scoped lang="scss">
</style>
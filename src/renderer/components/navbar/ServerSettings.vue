<template>
    <Modal title="lobby server settings">
        <div class="gridform">

            <div>Server</div>
            <Select v-model="settingsStore.lobbyServer" :options="serverOptions" />

			<Button>Add Server</Button>

            <OverlayPanel ref="op">
                <div class="container">
                    {{ tooltipMessage }}
                </div>
            </OverlayPanel>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Button from "@renderer/components/controls/Button.vue";
import OverlayPanel from "primevue/overlaypanel";
import { asyncComputed } from "@vueuse/core";
import { settingsStore } from "@renderer/store/settings.store";
import { infosStore } from "@renderer/store/infos.store";


const op = ref();
const tooltipMessage = ref("");

const serverOptions = [
    "server4.beyondallreason.info",
    "server5.beyondallreason.info",
    "lobby-server-dev.beyondallreason.dev" ,
	"localhost",
];


</script>

<style lang="scss" scoped>
.container {
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
}
</style>

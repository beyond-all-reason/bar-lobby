<template>
    <Modal ref="modal" :title="title" width="600px" height="75vh" padding="0">
        <div class="container">
            <MapListComponent @mapSelected="mapSelected" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";

import Modal from "@/components/common/Modal.vue";
import MapListComponent from "@/components/maps/MapListComponent.vue";
import { MapData } from "@/model/map-data";

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

const props = defineProps<{
    title: string;
}>();

const emit = defineEmits(["mapSelected"]);

function mapSelected(map: MapData) {
    emit("mapSelected", map.scriptName);
}
</script>

<style lang="scss" scoped>
.container {
    padding: 15px;
}
</style>

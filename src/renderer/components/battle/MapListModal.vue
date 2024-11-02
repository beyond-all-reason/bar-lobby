<template>
    <Modal :title="title" class="map-list-modal">
        <MapListComponent @map-selected="mapSelected" />
    </Modal>
</template>

<script lang="ts" setup>
import { MapData } from "@main/content/maps/map-data";
import Modal from "@renderer/components/common/Modal.vue";
import MapListComponent from "@renderer/components/maps/MapListComponent.vue";

defineProps<{
    title: string;
}>();

const emit = defineEmits(["mapSelected"]);

function mapSelected(map: MapData) {
    emit("mapSelected", map.scriptName);
}
</script>

<style lang="scss" scoped>
:global(.map-list-modal) {
    width: 90vw;
    height: 80vh;
}
.container {
    padding: 15px;
}
.map-list {
    width: 1000px;
}
</style>

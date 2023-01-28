<template>
    <Modal :title="title" height="80vh" width="90vw">
        <MapListComponent @map-selected="mapSelected" />
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";
import MapListComponent from "@/components/maps/MapListComponent.vue";
import { MapData } from "@/model/map-data";

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
.map-list {
    width: 1000px;
}
</style>

<template>
    <Modal :title="title" style="height: 80vh; width: 80vw; max-width: 1440px">
        <div class="layout">
            <div class="map-filters">
                <MapFiltersComponent />
            </div>
            <MapListComponent @map-selected="mapSelected" />
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { MapData } from "@main/content/maps/map-data";
import Modal from "@renderer/components/common/Modal.vue";
import MapFiltersComponent from "@renderer/components/maps/MapFiltersComponent.vue";
import MapListComponent from "@renderer/components/maps/MapListComponent.vue";

defineProps<{
    title: string;
}>();

const emit = defineEmits(["mapSelected"]);

function mapSelected(map: MapData) {
    emit("mapSelected", map);
}
</script>

<style lang="scss" scoped>
.layout {
    display: flex;
    flex-direction: row;
    gap: 20px;
    height: 100%;
}
.map-filters {
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}
</style>

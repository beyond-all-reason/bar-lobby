<template>
    <Range v-model="range" :min="2" :max="40" range />
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import Range from "@renderer/components/controls/Range.vue";
import { mapsStore } from "@renderer/store/maps.store";

const { filters } = mapsStore;
const range = ref([filters.minPlayers, filters.maxPlayers]);
watch(range, (newRange) => {
    filters.minPlayers = newRange[0];
    filters.maxPlayers = newRange[1];
});
</script>

<style lang="scss" scoped></style>

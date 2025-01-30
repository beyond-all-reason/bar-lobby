<template>
    <Checkbox v-model="favoritesOnly" label="Favorites Only"> </Checkbox>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import { mapsStore } from "@renderer/store/maps.store";

const favoritesOnly = ref(false);

watch(favoritesOnly, (newFavoritesOnly) => {
    mapsStore.filters.favoritesOnly = newFavoritesOnly;
});
</script>

<style lang="scss" scoped></style>

<template>
    <Checkbox v-model="downloadedOnly" label="Downloaded"> </Checkbox>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import { mapsStore } from "@renderer/store/maps.store";

const downloadedOnly = ref(false);

watch(downloadedOnly, (newDownloadedOnly) => {
    mapsStore.filters.downloadedOnly = newDownloadedOnly;
});
</script>

<style lang="scss" scoped></style>

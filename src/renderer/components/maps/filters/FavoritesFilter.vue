<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Checkbox v-model="favoritesOnly" :label="t('lobby.components.maps.filters.favoritesFilter.label')"> </Checkbox>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import { mapsStore } from "@renderer/store/maps.store";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const favoritesOnly = ref(false);

watch(favoritesOnly, (newFavoritesOnly) => {
    mapsStore.filters.favoritesOnly = newFavoritesOnly;
});
</script>

<style lang="scss" scoped></style>

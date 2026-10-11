<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Checkbox v-model="filters.favoritesOnly" :label="t('lobby.components.maps.filters.favoritesFilter.label')"> </Checkbox>
</template>

<script setup lang="ts">
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import { useMapFilters } from "@renderer/store/maps.store";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const filters = useMapFilters();
</script>

<style lang="scss" scoped></style>

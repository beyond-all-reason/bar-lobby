<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Skirmish vs AI", order: 1, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Button @click="openGameModeSelector">Select Game Mode</Button>
    </div>
</template>

<script lang="ts" setup>
import { onActivated } from "vue";
import { useRouter } from "vue-router";
import { battleStore } from "@renderer/store/battle.store";
import Button from "@renderer/components/controls/Button.vue";

const router = useRouter();
const route = router.currentRoute.value;

function openGameModeSelector() {
    battleStore.isSelectingGameMode = true;
}

onActivated(openGameModeSelector);
</script>

<style lang="scss" scoped></style>

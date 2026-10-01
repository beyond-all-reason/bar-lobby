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
    </div>
</template>

<script lang="ts" setup>
import { onActivated } from "vue";
import { useRouter } from "vue-router";
import { battleStore } from "@renderer/store/battle.store";

const router = useRouter();
const route = router.currentRoute.value;

onActivated(() => {
    battleStore.isSelectingGameMode = true;
});
</script>

<style lang="scss" scoped></style>

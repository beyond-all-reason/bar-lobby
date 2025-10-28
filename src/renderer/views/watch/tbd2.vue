<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "TBD", order: 2, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

const router = useRouter();
const route = router.currentRoute.value;
</script>

<style lang="scss" scoped></style>

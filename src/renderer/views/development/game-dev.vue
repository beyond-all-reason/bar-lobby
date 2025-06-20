<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Game", order: 0, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
    - Models and Animation
    - Lua, Widgets, Gadgets
    - Music and Sounds
    - Unit Definitions
    "
        />
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import Markdown from "@renderer/components/misc/Markdown.vue";
import { useI18n } from "vue-i18n";

const router = useRouter();
const route = router.currentRoute.value;
const { t } = useI18n();
</script>

<style lang="scss" scoped></style>

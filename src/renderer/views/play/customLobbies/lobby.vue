<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Lobby", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <Panel><Button @click="tachyon.leaveLobby()">Leave Lobby</Button> <p>{{tachyonStore.activeLobby}}</p> </Panel>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import { tachyonStore, tachyon } from "@renderer/store/tachyon.store";
</script>

<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "B", order: 4 } }
</route>

<template>
    <div>
        <Select v-model="color" :options="colors" />
    </div>
</template>

<script lang="ts" setup>
import { delay } from "$/jaz-ts-utils/delay";
import { ref } from "vue";

import Select from "@renderer/components/controls/Select.vue";

const color = ref("red");
const colors = ref(["red", "green", "blue"]);

await delay(1000);
</script>

<style lang="scss" scoped></style>

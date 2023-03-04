<template>
    <div class="scenario-tile">
        {{ scenarioImagePath }}
    </div>
</template>

<script lang="ts" setup>
import path from "path";

import { Scenario } from "@/model/scenario";

const props = defineProps<{
    scenario: Scenario;
}>();

const scenarioImagePath = path.join(api.info.contentPath, "scenario-images", props.scenario.imagepath);
</script>

<style lang="scss" scoped>
.scenario-tile {
    background: red;
    height: 200px;
}
</style>

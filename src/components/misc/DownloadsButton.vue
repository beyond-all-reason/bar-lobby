<template>
    <Button class="icon downloads-button" @click="downloadsModal" :style="`--downloadPercent: ${downloadPercentStr}`">
        <Icon icon="download" :size="40" />
    </Button>
    <Downloads @percentChange="percentChange" />
</template>

<script lang="ts" setup>
import Icon from "@/components/common/Icon.vue";
import Downloads from "@/components/misc/Downloads.vue";
import Button from "@/components/inputs/Button.vue";
import { ref } from "vue";

const downloadsModal = () => window.api.modals.open("downloads");

const downloadPercentStr = ref("0%");
const percentChange = (percent: number) => {
    downloadPercentStr.value = `${percent * 100}%`;
};
</script>
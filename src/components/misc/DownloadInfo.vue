<template>
    <div class="download-info flex-row" :class="{ hidden: percent === 1 }">
        <div class="download-info__background"></div>
        <div class="download-info__percent flex-col flex-center">{{ percent * 100 }}%</div>
        <div class="flex-col flex-center-content">
            <div class="download-info__label">Downloading {{ downloadType }}</div>
            <div class="download-info__content">{{ content }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const downloadType = ref("");
const content = ref("");
const percent = ref(0);
</script>
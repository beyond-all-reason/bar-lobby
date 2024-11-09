<template>
    <Button v-if="map.isInstalled" class="green" :class="props.class" :disabled="props.disabled" @click="props.onClick">
        <slot />
    </Button>
    <Button v-else-if="map.isDownloading" class="green" disabled>Downloading map ...</Button>
    <Button v-else class="red" @click="downloadMap(map.springName)">Download map</Button>
</template>

<script lang="ts" setup>
import { MapData } from "@main/content/maps/map-data";
import Button from "@renderer/components/controls/Button.vue";
import { downloadMap } from "@renderer/store/maps.store";
import { ButtonProps } from "primevue/button";

export interface Props extends /* @vue-ignore */ ButtonProps {
    map: MapData;
    disabled?: boolean;
    class?: string;
    onClick?: (event: MouseEvent) => void;
}

const props = defineProps<Props>();
</script>

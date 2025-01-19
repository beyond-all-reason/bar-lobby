<template>
    <button
        v-if="map.isInstalled"
        class="quick-play-button fullwidth"
        :class="props.class"
        :disabled="props.disabled"
        @click="props.onClick"
    >
        <slot />
    </button>
    <Button v-else-if="map.isDownloading" class="quick-play-button fullwidth" disabled>Downloading map ...</Button>
    <Button v-else class="red fullwidth" @click="downloadMap(map.springName)">Download map</Button>
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

<style lang="scss" scoped>
.quick-play-button {
    align-self: center;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.8rem;
    padding: 10px 40px;
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.quick-play-button:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}

.quick-play-button::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%) scale(0);
    border-radius: 50%;
    transition: transform 0.4s ease;
}

.quick-play-button:hover::before {
    box-shadow: 0 8px 15px rgba(34, 197, 94, 0.4);
}
</style>

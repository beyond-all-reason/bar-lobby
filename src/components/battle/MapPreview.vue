<template>
    <div>
        {{ texture }}
    </div>
</template>

<script lang="ts" setup>
import { computed, defineProps } from "vue";

const props = defineProps({
    filename: {
        type: String,
        required: true
    }
});

const mapImagesPath = window.api.content.getMapImagesPath();
const map = computed(() => window.api.content.getMap(props.filename));

const texture = computed(() => map.value);

//const map = window.api.content.getMapImagesPath
</script>
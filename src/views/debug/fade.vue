<route lang="json">
{
    "meta": {
        "title": "Fade",
        "order": 2,
        "transition": {
            "name": "fade"
        }
    }
}
</route>

<template>
    <div>
        <div>Fade</div>
        <div>{{ counter }}</div>
        <button @click="counter++">Increase</button>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const counter = ref(0);
</script>
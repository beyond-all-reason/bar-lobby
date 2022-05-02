<template>
    <div>
        First time setup WIP
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const installDir = ref("");

const emit = defineEmits<{
    (event: "complete"): void;
}>();
</script>
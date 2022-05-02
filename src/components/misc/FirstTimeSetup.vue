<template>
    <div>
        <div>Installation folder</div>
        <Textbox v-model="installDir" />
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Textbox from "@/components/inputs/Textbox.vue";

const installDir = ref("");

const emit = defineEmits<{
    (event: "complete"): void;
}>();
</script>
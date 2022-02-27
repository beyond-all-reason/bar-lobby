<template>
    <Modal name="downloads">
        Downloads
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";

const emits = defineEmits<{
    (e: "percentChange", newPercent: number): void;
}>();

// TODO
</script>
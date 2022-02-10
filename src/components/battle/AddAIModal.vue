<template>
    <Modal name="add-ai" title="Add AI">
        <Button v-for="(ai, i) in ais" @click="addAi(ai)" :key="i">{{ ai.fullName }}</Button>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import { AIConfig, aiConfigs } from "@/model/ai";

const emit = defineEmits(["add-ai"]);

const ais = aiConfigs;

const addAi = (ai: AIConfig) => {
    emit("add-ai", ai);
    window.api.modals.close("add-ai");
};
</script>
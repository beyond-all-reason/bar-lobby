<template>
    <Modal name="add-ai" title="Add AI">
        <Button v-for="(ai, i) in ais" @click="addAi(ai)" :key="i">{{ ai.fullName }}</Button>
    </Modal>
</template>

<script lang="ts" setup>
import { api } from "@/api/api";
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import { ais } from "@/config/ais";
import { AI } from "@/model/ai";

const emit = defineEmits(["add-ai"]);

const availableAis = ais;

const addAi = (ai: AI) => {
    emit("add-ai", ai);
    api.modals.close("add-ai");
};
</script>
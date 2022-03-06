<template>
    <Modal name="add-ai" title="Add AI">
        <Button v-for="(ai, i) in ais" @click="addAi(ai)" :key="i">{{ ai.name }}</Button>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import { AI } from "@/model/ai";
import { EngineVersionFormat } from "@/model/formats";
import { computed } from "vue";

const props = defineProps<{
    engineVersion: EngineVersionFormat;
}>();

const ais = computed(() => window.api.content.ai.installedAis[props.engineVersion]);

const emit = defineEmits<{
    (event: "add-ai", id: AI): void;
}>();

const addAi = (ai: AI) => {
    emit("add-ai", ai);
    window.api.modals.close("add-ai");
};
</script>
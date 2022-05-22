<template>
    <Modal name="add-bot" title="Add Bot">
        <div class="gap-md">
            <Button v-for="(ai, i) in ais" :key="i" @click="addBot(ai)">
                {{ ai.name }}
            </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import { AI } from "@/model/ai";
import { EngineVersionFormat } from "@/model/formats";

const props = defineProps<{
    engineVersion: EngineVersionFormat;
}>();

const ais = computed(() => api.content.ai.installedAis[props.engineVersion]);

const emit = defineEmits<{
    (event: "add-bot", ai: AI): void;
}>();

const addBot = (ai: AI) => {
    emit("add-bot", ai);
    api.modals.close("add-bot");
};
</script>

<style lang="scss" scoped></style>

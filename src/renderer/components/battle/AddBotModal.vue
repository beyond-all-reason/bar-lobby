<template>
    <Modal title="Add Bot">
        <div class="flex-col gap-md container">
            <Button
                v-for="(ai, i) in ais"
                :key="i"
                v-tooltip.bottom="{ value: getAiDescription(ai) }"
                class="ai-button"
                @click="addBot(ai)"
            >
                {{ getAiFriendlyName(ai) }}
            </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import { getAiFriendlyName } from "@/model/ai";
import { getAiDescription } from "@/model/ai";

const props = defineProps<{
    engineVersion: string;
    teamId: number;
}>();

api.content.ai.processAis(props.engineVersion);
const ais = computed(() => api.content.ai.getAis(props.engineVersion));

const emit = defineEmits<{
    (event: "bot-selected", bot: string, teamId: number): void;
}>();

function addBot(bot: string) {
    emit("bot-selected", bot, props.teamId);
}
</script>

<style lang="scss" scoped>
.ai-button {
    padding: 15px;
}
.container {
    width: 500px;
}
</style>

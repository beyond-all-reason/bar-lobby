<template>
    <Modal title="Add Bot">
        <div class="flex-col gap-md container">
            <Button v-for="(ai, i) in ais" :key="i" v-tooltip.bottom="{ value: ai.description }" class="ai-button" @click="addBot(ai)">
                {{ ai.name }}
            </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { EngineAI } from "@main/content/engine/engine-version";
import { GameAI } from "@main/content/game/game-version";

const props = defineProps<{
    engineVersion: string;
    gameVersion: string;
    teamId: string;
}>();

const ais = computed(() => {
    const ais: Array<EngineAI | GameAI> = [];

    // TODO probably need a selected engine/game version store or something similar

    // if (engineVersion.value) {
    //     ais.push(...engineVersion.value.ais);
    // }
    // if (gameVersion.value) {
    //     ais.push(...gameVersion.value.ais);
    // }
    return ais;
});

const emit = defineEmits<{
    (event: "bot-selected", ai: EngineAI | GameAI, teamId: string): void;
}>();

function addBot(ai: EngineAI | GameAI) {
    emit("bot-selected", ai, props.teamId);
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

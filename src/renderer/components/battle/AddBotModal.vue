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

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";
import { EngineAI } from "@/model/cache/engine-version";
import { GameAI } from "@/model/cache/game-version";

const props = defineProps<{
    engineVersion: string;
    gameVersion: string;
    teamId: number;
}>();

const engineVersion = computed(() => {
    return api.content.engine.installedVersions.find((version) => version.id === props.engineVersion);
});

const gameVersion = computed(() => {
    return api.content.game.installedVersions.find((version) => version.id === props.gameVersion);
});

const ais = computed(() => {
    const ais: Array<EngineAI | GameAI> = [];
    if (engineVersion.value) {
        ais.push(...engineVersion.value.ais);
    }
    if (gameVersion.value) {
        ais.push(...gameVersion.value.ais);
    }
    return ais;
});

const emit = defineEmits<{
    (event: "bot-selected", ai: EngineAI | GameAI, teamId: number): void;
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

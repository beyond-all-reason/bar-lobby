<template>
    <Modal title="Add Bot">
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

const props = defineProps<{
    engineVersion: string;
}>();

const ais = computed(() => api.content.ai.getAis(props.engineVersion));

const emit = defineEmits<{
    (event: "add-bot", ai: AI): void;
}>();

const addBot = (ai: AI) => {
    emit("add-bot", ai);
};
</script>

<style lang="scss" scoped></style>

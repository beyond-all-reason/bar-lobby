<template>
    <div class="battle-preview">
        {{ battle.name }}
    </div>
</template>

<script lang="ts" setup>
import type { BattlePreviewType } from "@/model/battle/battle-preview";

const props = defineProps<{
    battle: BattlePreviewType
}>();
</script>
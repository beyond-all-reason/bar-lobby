<template>
    <div class="fullscreen" :class="{ hidden: !battleStore.isSelectingGameMode }" @click="battleStore.isSelectingGameMode = false">
        <div class="gamemode-container">
            <GameModeSelector
                @selected="
                    battleStore.isSelectingGameMode = false;
                    $emit('closed');
                "
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import GameModeSelector from "@renderer/components/misc/GameModeSelector.vue";
import { battleStore } from "@renderer/store/battle.store";
import { ref, watch } from "vue";

const props = defineProps<{
    visible: boolean;
}>();

defineEmits(["closed"]);

const visible = ref(props.visible);
watch(
    () => props.visible,
    (value) => {
        visible.value = value;
    }
);
</script>

<style lang="scss" scoped>
.fullscreen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2;
    transition: all 0.2s ease-in-out;
    &.hidden {
        opacity: 0;
    }
    backdrop-filter: blur(5px) saturate(20%);
}
.hidden {
    pointer-events: none;
}

.gamemode-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    gap: 20px;
    height: 720px;
    width: 1300px;
    overflow: visible;
}
</style>

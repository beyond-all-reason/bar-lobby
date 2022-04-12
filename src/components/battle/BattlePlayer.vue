<template>
    <div class="player">
        <Icon :icon="icon" :size="16" />
        <div v-if="countryCode" :class="`player__flag fi fi-${countryCode}`" />
        <div class="player__name">
            {{ name }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import Icon from "@/components/common/Icon.vue";
import { Bot, isBot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";
import { Spectator } from "@/model/battle/spectator";
import { computed, ref } from "vue";

const props = defineProps<{
    player: Player | Bot | Spectator
}>();

const user = computed(() => {
    if ("userId" in props.player) {
        return window.api.session.getUserById(props.player.userId);
    }
    return undefined;
});

const name = computed(() => {
    if (user.value) {
        return user.value?.username ?? "Player";
    } else if (isBot(props.player)) {
        return props.player.name;
    }
    return "Player";
});

const icon = ref("account");
const countryCode = ref("");

if (isBot(props.player)) {
    icon.value = "robot";
}
</script>
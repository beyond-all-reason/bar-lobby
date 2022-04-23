<template>
    <div class="participant">
        <Icon :icon="icon" :size="16" />
        <div v-if="countryCode" :class="`participant__flag fi fi-${countryCode}`" />
        <div class="participant__name">
            {{ name }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import Icon from "@/components/common/Icon.vue";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { computed, ref } from "vue";

const props = defineProps<{
    participant: Player | Bot | Spectator
}>();

const user = computed(() => {
    if ("userId" in props.participant) {
        return window.api.session.getUserById(props.participant.userId);
    }
    return undefined;
});

const name = computed(() => {
    if (user.value) {
        return user.value?.username ?? "Player";
    } else if (props.participant.type === "bot") {
        return props.participant.name;
    }
    return "Player";
});

const icon = computed(() => props.participant.type === "bot" ? "robot" : "account");
const countryCode = ref("");
</script>
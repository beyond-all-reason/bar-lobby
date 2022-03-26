<template>
    <div class="player">
        <Icon :icon="isBot ? 'robot' : 'account'" :size="16" />
        <div v-if="countryCode" :class="`player__flag fi fi-${countryCode}`" />
        <div class="player__name">
            {{ name }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import Icon from "@/components/common/Icon.vue";

const props = withDefaults(defineProps<{
    name: string;
    isBot?: boolean;
    countryCode?: string;
}>(), {
    isBot: false,
    countryCode: ""
});
</script>
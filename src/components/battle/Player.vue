<template>
    <ContextMenu :entries="[
        { label: 'View Profile', action: kickPlayer },
        { label: 'Message', action: kickPlayer },
        { label: 'Kick', action: kickPlayer },
        { label: 'Block', action: kickPlayer },
        { label: 'Add Friend', action: kickPlayer },
        { label: 'Report', action: kickPlayer },
    ]"
    >
        <div class="player">
            <Icon :icon="isBot ? 'robot' : 'account'" :size="16" />
            <div v-if="countryCode" :class="`player__flag fi fi-${countryCode}`" />
            <div class="player__name">
                {{ name }}
            </div>
        </div>
    </ContextMenu>
</template>

<script lang="ts" setup>
import Icon from "@/components/common/Icon.vue";
import ContextMenu from "@/components/common/ContextMenu.vue";

const props = withDefaults(defineProps<{
    name: string;
    isBot?: boolean;
    countryCode?: string;
}>(), {
    isBot: false,
    countryCode: ""
});

const kickPlayer = () => {
    console.log("kick");
};
</script>
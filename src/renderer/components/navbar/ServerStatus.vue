<template>
    <Button>
        <div class="flex-row flex-center gap-sm">
            <div class="server-status-dot" :class="{ offline: !tachyonStore.isConnected }">⬤</div>
            <div v-if="tachyonStore.isConnected">{{ tachyonStore.serverStats?.userCount || 0 }} Players Online</div>
            <div v-else-if="tachyonStore.error">Error</div>
            <div v-else>Reconnecting...</div>
        </div>
    </Button>
</template>
<script lang="ts" setup>
import Button from "@renderer/components/controls/Button.vue";
import { tachyonStore } from "@renderer/store/tachyon.store";
</script>
<style lang="scss" scoped>
.server-status-dot {
    font-size: 12px;
    margin-right: 4px;
    color: rgb(121, 226, 0);
    &.offline {
        color: rgb(216, 46, 46);
    }
}
</style>

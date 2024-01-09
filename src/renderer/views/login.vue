<route lang="json5">
{ meta: { empty: true, blurBg: true, transition: { name: "login" } } }
</route>

<template>
    <div class="container">
        <img ref="logo" class="logo" src="/images/BARLogoFull.png" />

        <div v-if="connecting" class="relative">
            <Loader></Loader>
        </div>

        <div v-else class="flex-col gap-md">
            <div class="txt-error">Could not connect to {{ serverAddress }}</div>
            <Button class="retry gap-sm" @click="connect">
                <Icon :icon="replayIcon" />
                Reconnect
            </Button>
        </div>

        <div class="play-offline" @click="playOffline">Play Offline</div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import replayIcon from "@iconify-icons/mdi/replay";
import { delay } from "jaz-ts-utils";
import { ref } from "vue";

import Loader from "@/components/common/Loader.vue";
import Button from "@/components/controls/Button.vue";

const serverAddress = `${api.comms.config.host}:${api.comms.config.port}`;
const connecting = ref(false);

async function connect() {
    connecting.value = true;
    try {
        await api.comms.connect(api.info.steamSessionTicket);
    } catch (err) {
        console.error(err);
    } finally {
        await delay(100);
        connecting.value = false;
    }
}

async function playOffline() {
    api.session.offlineMode.value = true;
    api.comms.disconnect();
    await api.router.push("/singleplayer/custom");
}

await connect();
</script>

<style lang="scss" scoped>
.container {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: calc((100vh - 900px) / 2);
    width: 500px;
    margin-left: auto;
    margin-right: auto;
}

.logo {
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    margin-bottom: 80px;
}

.login-forms {
    width: 100%;
    :deep(.content) {
        padding: 0;
    }
}

.retry {
    align-self: center;
}

.play-offline {
    display: flex;
    align-self: center;
    margin-top: 20px;
    font-size: 16px;
    opacity: 0.3;
    &:hover {
        opacity: 1;
    }
}
</style>

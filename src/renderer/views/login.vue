<route lang="json5">
{ meta: { empty: true, blurBg: true, transition: { name: "login" } } }
</route>

<template>
    <div class="container">
        <img ref="logo" class="logo" src="/images/BARLogoFull.png" />
        <div v-if="connecting" class="relative">
            <Loader></Loader>
        </div>
        <Panel v-else-if="isConnected" class="login-forms">
            <TabView v-model:activeIndex="activeIndex">
                <TabPanel header="Login">
                    <LoginForm />
                </TabPanel>
                <TabPanel header="Register">
                    <RegisterForm @register-success="activeIndex = 0" />
                </TabPanel>
                <TabPanel header="Reset Password">
                    <ResetPasswordForm />
                </TabPanel>
            </TabView>
        </Panel>
        <div v-else class="flex-col gap-md">
            <div class="txt-error">Disconnected from {{ serverAddress }}</div>
            <Button class="retry gap-sm" @click="onRetry">
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
import TabPanel from "primevue/tabpanel";
import { ref } from "vue";

import Loader from "@/components/common/Loader.vue";
import Panel from "@/components/common/Panel.vue";
import TabView from "@/components/common/TabView.vue";
import Button from "@/components/controls/Button.vue";
import LoginForm from "@/components/login/LoginForm.vue";
import RegisterForm from "@/components/login/RegisterForm.vue";
import ResetPasswordForm from "@/components/login/ResetPasswordForm.vue";

const activeIndex = ref(0);
const isConnected = api.comms.isConnected;
const serverAddress = `${api.comms.config.host}:${api.comms.config.port}`;
const connecting = ref(false);

async function connect() {
    try {
        await api.comms.connect();
    } catch (err) {
        console.error(err);
    }
}

async function onRetry() {
    connecting.value = true;
    await connect();
    await delay(100);
    connecting.value = false;
}

async function playOffline() {
    api.session.offlineMode.value = true;
    api.comms.disconnect();
    await api.router.push("/singleplayer/custom");
}

connect();
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

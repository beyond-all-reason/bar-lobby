<route lang="json5">
{ meta: { empty: true, blurBg: true, transition: { name: "login" } } }
</route>

<template>
    <div class="container">
        <img ref="logo" class="logo" src="/src/renderer/assets/images/BARLogoFull.png" />
        <div v-if="connecting" class="relative">
            <Loader></Loader>
        </div>
        <Panel v-else-if="isConnected" class="login-forms" no-padding>
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
import { delay } from "$/jaz-ts-utils/delay";
import TabPanel from "primevue/tabpanel";
import { ref } from "vue";

import Loader from "@renderer/components/common/Loader.vue";
import Panel from "@renderer/components/common/Panel.vue";
import TabView from "@renderer/components/common/TabView.vue";
import Button from "@renderer/components/controls/Button.vue";
import LoginForm from "@renderer/components/login/LoginForm.vue";
import RegisterForm from "@renderer/components/login/RegisterForm.vue";
import ResetPasswordForm from "@renderer/components/login/ResetPasswordForm.vue";
import { useRouter } from "vue-router";

const router = useRouter();

const activeIndex = ref(0);
const isConnected = true; // api.comms.isConnected;
const serverAddress = ""; //`${api.comms.config.host}:${api.comms.config.port}`;
const connecting = ref(false);

async function connect() {
    try {
        // await api.comms.connect();
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
    // api.session.offlineMode = true;
    // api.comms.disconnect();
    await router.push("/home/overview");
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

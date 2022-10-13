<route lang="json">
{ "meta": { "empty": true, "blurBg": true, "offline": true, "transition": { "name": "login" } } }
</route>

<template>
    <div class="container">
        <img ref="logo" class="logo" src="@/assets/images/BARLogoFull.png" />
        <Panel v-if="isConnected" class="login-forms" padding="0">
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
            <div class="txt-error">Could not connect to {{ serverAddress }}</div>
            <Button class="retry" @click="onRetry">
                <Icon :icon="replayIcon" />
                Retry
            </Button>
        </div>
        <div class="play-offline" @click="playOffline">Play Offline</div>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import replayIcon from "@iconify-icons/mdi/replay";
import { ref } from "vue";

import Panel from "@/components/common/Panel.vue";
import TabPanel from "@/components/common/TabPanel.vue";
import TabView from "@/components/common/TabView.vue";
import Button from "@/components/controls/Button.vue";
import LoginForm from "@/components/login/LoginForm.vue";
import RegisterForm from "@/components/login/RegisterForm.vue";
import ResetPasswordForm from "@/components/login/ResetPasswordForm.vue";

const activeIndex = ref(0);
const isConnected = api.comms.isConnected;
const serverAddress = `${api.comms.config.host}:${api.comms.config.port}`;

const connect = async () => {
    try {
        await api.comms.connect();
    } catch (err) {
        console.error(err);
    }
};

const onRetry = async () => {
    await connect();
};

const playOffline = () => {
    api.session.offlineMode.value = true;
    api.comms.disconnect();
    api.router.push("/singleplayer/custom");
};

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

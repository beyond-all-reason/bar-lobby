<template>
    <div>
        <Loader v-if="loading" />
        <form v-else-if="!requestVerification" ref="form" class="flex-col gap-md" @submit.prevent="login" @keydown.enter="login">
            <p v-if="loginError" class="error">
                {{ loginError }}
            </p>
            <Textbox v-model="email" type="email" label="Email" required validate class="fullwidth" />
            <Textbox v-model="password" type="password" label="Password" required class="fullwidth" />
            <div class="flex-row gap-md">
                <Checkbox v-model="settings.loginAutomatically" type="checkbox" label="Remember Me" />
                <Button class="blue fullwidth" type="submit"> Login </Button>
            </div>
        </form>
        <form v-else class="flex-col gap-md" @submit.prevent="verify">
            <p v-if="verificationError" class="txt-error">
                {{ verificationError }}
            </p>
            <!-- eslint-disable vue/no-v-html -->
            <p v-html="verificationMessage" />
            <Textbox v-model="verificationCode" label="Verification Code" required />
            <Button type="submit"> Verify </Button>
        </form>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";

import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { linkify } from "@renderer/utils/linkify";
import { settingsStore } from "@renderer/store/settings.store";

const loading = ref(false);
const email = ref("");
const password = ref("");
const requestVerification = ref(false);
const verificationMessage = ref("");
const verificationCode = ref("");
const loginError = ref("");
const verificationError = ref("");

if (settingsStore.loginAutomatically) {
    if (api.account.model.email) {
        email.value = api.account.model.email;
    }
}

watch(
    () => api.account.model.email,
    () => (email.value = api.account.model.email)
);

async function login() {
    loading.value = true;
    const tokenResponse = await api.comms.request("c.auth.get_token", { email: email.value, password: password.value });
    if (tokenResponse.result === "success" && tokenResponse.token) {
        api.account.model.email = email.value;
        api.account.model.token = tokenResponse.token;
        const loginResponse = await api.comms.request("c.auth.login", {
            token: api.account.model.token,
            //TODO replace with infosStore
            // lobby_name: api.info.lobby.name,
            // lobby_version: api.info.lobby.version,
            // lobby_hash: api.info.lobby.hash,
        });
        if (loginResponse.result === "success") {
            return;
        } else if (loginResponse.result === "unverified" && loginResponse.agreement) {
            verificationMessage.value = linkify(loginResponse.agreement);
            requestVerification.value = true;
        } else {
            if (loginResponse.reason) {
                loginError.value = loginResponse.reason;
            }
        }
    } else {
        if (tokenResponse.reason) {
            loginError.value = tokenResponse.reason;
        }
    }
    loading.value = false;
}

async function verify() {
    loading.value = true;
    const verifyResult = await api.comms.request("c.auth.verify", { token: api.account.model.token, code: verificationCode.value });
    if (verifyResult.reason) {
        verificationError.value = verifyResult.reason;
    }
    loading.value = false;
}
</script>

<style lang="scss" scoped></style>

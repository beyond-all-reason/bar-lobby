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
                <Checkbox v-model="loginAutomatically" type="checkbox" label="Remember Me" />
                <Button class="blue fullwidth" type="submit"> Login </Button>
            </div>
        </form>
        <form v-else class="flex-col gap-md" @submit.prevent="verify">
            <p v-if="verificationError" class="error">
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

import Loader from "@/components/common/Loader.vue";
import Button from "@/components/inputs/Button.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import { linkify } from "@/utils/linkify";

const loading = ref(false);
const email = ref("");
const password = ref("");
const loginAutomatically = api.settings.model.loginAutomatically;
const requestVerification = ref(false);
const verificationMessage = ref("");
const verificationCode = ref("");
const loginError = ref("");
const verificationError = ref("");

if (loginAutomatically.value) {
    if (api.account.model.email.value) {
        email.value = api.account.model.email.value;
    }
}

watch(api.account.model.email, () => (email.value = api.account.model.email.value));

const login = async () => {
    loading.value = true;

    const tokenResponse = await api.comms.request("c.auth.get_token", { email: email.value, password: password.value });

    if (tokenResponse.result === "success" && tokenResponse.token) {
        api.account.model.email.value = email.value;
        api.account.model.token.value = tokenResponse.token;

        const loginResponse = await api.comms.request("c.auth.login", {
            token: api.account.model.token.value,
            lobby_name: api.info.lobby.name,
            lobby_version: api.info.lobby.version,
            lobby_hash: api.info.lobby.hash,
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
};

const verify = async () => {
    loading.value = true;

    const verifyResult = await api.comms.request("c.auth.verify", { token: api.account.model.token.value, code: verificationCode.value });

    if (verifyResult.reason) {
        verificationError.value = verifyResult.reason;
    }

    loading.value = false;
};
</script>

<style lang="scss" scoped>
.error {
    color: rgb(255, 130, 130);
}
</style>

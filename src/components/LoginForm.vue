<template>
    <div>
        <Loader v-if="loading" />
        <form v-else-if="!requestVerification" ref="form" @submit.prevent="login" class="flex-col gap-md">
            <p v-if="loginError" class="color--error">{{ loginError }}</p>
            <Textbox type="email" label="Email" v-model="email" required validate />
            <Textbox type="password" label="Password" v-model="password" required />
            <div class="flex-row gap-md">
                <Checkbox type="checkbox" label="Remember Me" v-model="remember" />
                <Button type="submit">Login</Button>
            </div>
        </form>
        <form v-else @submit.prevent="verify" class="flex-col gap-md">
            <p v-if="verificationError" class="color--error">{{ verificationError }}</p>
            <p v-html="verificationMessage"></p>
            <Textbox label="Verification Code" v-model="verificationCode" required />
            <Button type="submit">Verify</Button>
        </form>
    </div>
</template>

<script lang="ts" setup>
import { linkify } from "@/utils/linkify";
import { loginRequest } from "@/utils/login-request";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import Loader from "@/components/common/Loader.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Button from "./inputs/Button.vue";

const router = useRouter();
const loading = ref(false);
const email = ref("");
const password = ref("");
const remember = window.api.accounts.model.remember;
const requestVerification = ref(false);
const verificationMessage = ref("");
const verificationCode = ref("");
const loginError = ref("");
const verificationError = ref("");

if (remember.value && window.api.accounts.model.email.value) {
    email.value = window.api.accounts.model.email.value;
}

if (remember.value && window.api.accounts.model.password.value) {
    password.value = window.api.accounts.model.password.value;
}

watch(window.api.accounts.model.email, () => email.value = window.api.accounts.model.email.value);
watch(window.api.accounts.model.password, () => password.value = window.api.accounts.model.password.value);

const login = async () => {
    loading.value = true;

    const tokenResponse = await window.api.client.getToken({ email: email.value, password: password.value });

    if (tokenResponse.result === "success" && tokenResponse.token) {
        if (remember.value) {
            window.api.accounts.model.email.value = email.value;
            window.api.accounts.model.password.value = password.value;
            window.api.accounts.model.token.value = tokenResponse.token;
        } else {
            window.api.accounts.model.email.value = "";
            window.api.accounts.model.password.value = "";
            window.api.accounts.model.token.value = "";
        }

        const loginResponse = await loginRequest({
            token: window.api.accounts.model.token.value,
            lobby_name: window.info.lobby.name,
            lobby_version: window.info.lobby.version,
            lobby_hash: window.info.lobby.hash
        });

        if (loginResponse.result === "success") {
            await router.push("/home");
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

    const verifyResult = await window.api.client.verify({ token: window.api.accounts.model.token.value, code: verificationCode.value });

    if (verifyResult.result === "success") {
        // TODO: store user info
        await router.push("/home");
    } else if (verifyResult.reason) {
        verificationError.value = verifyResult.reason;
    }

    loading.value = false;
};
</script>


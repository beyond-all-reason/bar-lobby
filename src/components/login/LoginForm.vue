<template>
    <div>
        <Loader v-if="loading" />
        <form v-else-if="!requestVerification" ref="form" class="flex-col gap-md" @submit.prevent="login">
            <p v-if="loginError" class="color--error">
                {{ loginError }}
            </p>
            <Textbox v-model="email" type="email" label="Email" required validate />
            <Textbox v-model="password" type="password" label="Password" required />
            <div class="flex-row gap-md">
                <Checkbox v-model="loginAutomatically" type="checkbox" label="Login Automatically" />
                <Button class="btn--blue" type="submit">
                    Login
                </Button>
            </div>
        </form>
        <form v-else class="flex-col gap-md" @submit.prevent="verify">
            <p v-if="verificationError" class="color--error">
                {{ verificationError }}
            </p>
            <p v-html="verificationMessage" />
            <Textbox v-model="verificationCode" label="Verification Code" required />
            <Button type="submit">
                Verify
            </Button>
        </form>
    </div>
</template>

<script lang="ts" setup>
import { linkify } from "@/utils/linkify";
import { storeUserSession } from "@/utils/store-user-session";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import Loader from "@/components/common/Loader.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Button from "@/components/inputs/Button.vue";

const router = useRouter();
const loading = ref(false);
const email = ref("");
const password = ref("");
const token = ref("");
const loginAutomatically = window.api.settings.model.loginAutomatically;
const requestVerification = ref(false);
const verificationMessage = ref("");
const verificationCode = ref("");
const loginError = ref("");
const verificationError = ref("");

if (loginAutomatically.value) {
    if (window.api.account.model.email.value) {
        email.value = window.api.account.model.email.value;
    }
}

watch(window.api.account.model.email, () => email.value = window.api.account.model.email.value);

const login = async () => {
    loading.value = true;

    const tokenResponse = await window.api.client.getToken({ email: email.value, password: password.value });

    if (tokenResponse.result === "success" && tokenResponse.token) {
        window.api.account.model.email.value = email.value;
        window.api.account.model.token.value = tokenResponse.token;

        const loginResponse = await window.api.client.login({
            token: window.api.account.model.token.value,
            lobby_name: window.api.info.lobby.name,
            lobby_version: window.api.info.lobby.version,
            lobby_hash: window.api.info.lobby.hash
        });

        if (loginResponse.result === "success") {
            storeUserSession(loginResponse.user);
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

    const verifyResult = await window.api.client.verify({ token: window.api.account.model.token.value, code: verificationCode.value });

    if (verifyResult.result === "success") {
        if (verifyResult.user) {
            storeUserSession(verifyResult.user);
        }
        await router.push("/home");
    } else if (verifyResult.reason) {
        verificationError.value = verifyResult.reason;
    }

    loading.value = false;
};
</script>


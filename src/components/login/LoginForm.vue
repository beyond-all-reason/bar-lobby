<template>
    <div>
        <Loader v-if="loading" />
        <form v-else-if="!requestVerification" ref="form" class="flex-col gap-md" @submit.prevent="login" @keydown.enter="login">
            <p v-if="loginError" class="color--error">
                {{ loginError }}
            </p>
            <Textbox v-model="email" type="email" label="Email" required validate class="fullwidth" />
            <Textbox v-model="password" type="password" label="Password" required class="fullwidth" />
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
            <p>
                {{ verificationMessage }}
            </p>
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

watch(api.account.model.email, () => email.value = api.account.model.email.value);

const login = async () => {
    loading.value = true;

    const tokenResponse = await api.client.request("c.auth.get_token", { email: email.value, password: password.value });

    if (tokenResponse.result === "success" && tokenResponse.token) {
        api.account.model.email.value = email.value;
        api.account.model.token.value = tokenResponse.token;

        const loginResponse = await api.client.request("c.auth.login", {
            token: api.account.model.token.value,
            lobby_name: api.info.lobby.name,
            lobby_version: api.info.lobby.version,
            lobby_hash: api.info.lobby.hash
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

    const verifyResult = await api.client.request("c.auth.verify", { token: api.account.model.token.value, code: verificationCode.value });

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

<style lang="scss" scoped>

</style>


<template>
    <div>
        <Loader v-if="loading" />
        <form v-else-if="!requestVerification" ref="form" class="login-form" @submit.prevent="login">
            <Textbox type="email" label="Email" v-model="email" required validate />
            <Textbox type="password" label="Password" v-model="password" required />
            <div class="flex-row gap-md">
                <Checkbox type="checkbox" label="Remember Me" v-model="remember" />
                <Button type="submit">Login</Button>
            </div>
        </form>
        <form v-else @submit.prevent="verify">
            <p v-html="verificationMessage"></p>
            <Textbox label="Verification Code" v-model="verificationCode" required />
            <Button type="submit">Verify</Button>
        </form>
    </div>
</template>

<script lang="ts">
import { linkify } from "@/utils/linkify";
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup() {
        const loading = ref(false);
        const email = ref("");
        const password = ref("");
        const remember = ref(true);
        const requestVerification = ref(false);
        const verificationMessage = ref("");
        const verificationCode = ref("");
        const errorMessage = ref("");
    
        const storedEmail = window.settings.email?.value;
        if (storedEmail) {
            email.value = storedEmail;
        }

        let token = window.settings.token?.value ?? "";

        const login = async () => {
            const tokenResponse = await window.client.getToken({ email: email.value, password: password.value });

            if (tokenResponse.result === "success" && tokenResponse.token) {
                token = tokenResponse.token;

                const loginResponse = await window.client.login({ 
                    token,
                    lobby_name: window.info.lobby.name,
                    lobby_version: window.info.lobby.version,
                    lobby_hash: window.info.lobby.hash
                });

                if (loginResponse.result === "unverified" && loginResponse.agreement) {
                    verificationMessage.value = linkify(loginResponse.agreement);
                    requestVerification.value = true;
                }
            } else {
                if (tokenResponse.reason) {
                    errorMessage.value = tokenResponse.reason;
                }
            }
        };

        const verify = async () => {
            await window.client.verify({ token, code: verificationCode.value });
        };
        
        return {
            loading, email, password, token, remember, requestVerification, verificationMessage, verificationCode, errorMessage,
            login, verify
        };
    }
});
</script>


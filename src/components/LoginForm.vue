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
import { useRouter } from "vue-router";

export default defineComponent({
    props: {
        email: {
            type: String,
            default: "",
        },
        password: {
            type: String,
            default: "",
        }
    },
    setup(props) {
        const router = useRouter();
        const loading = ref(false);
        const email = ref(props.email);
        const password = ref(props.password);
        const remember = ref(true);
        const requestVerification = ref(false);
        const verificationMessage = ref("");
        const verificationCode = ref("");
        const errorMessage = ref("");
    
        const storedEmail = window.api.settings.settings.email?.value;
        if (storedEmail) {
            email.value = storedEmail;
        }

        const login = async () => {
            loading.value = true;
            
            const tokenResponse = await window.api.client.getToken({ email: email.value, password: password.value });

            if (tokenResponse.result === "success" && tokenResponse.token) {
                window.api.settings.settings.token.value = tokenResponse.token;

                const loginResponse = await window.api.client.login({ 
                    token: window.api.settings.settings.token.value,
                    lobby_name: window.info.lobby.name,
                    lobby_version: window.info.lobby.version,
                    lobby_hash: window.info.lobby.hash
                });

                if (loginResponse.result === "unverified" && loginResponse.agreement) {
                    verificationMessage.value = linkify(loginResponse.agreement);
                    requestVerification.value = true;
                    loading.value = false;
                } else if (loginResponse.result === "success") {
                    router.push("/home");
                } else {
                    if (loginResponse.reason) {
                        errorMessage.value = loginResponse.reason;
                    }
                    loading.value = false;
                }
            } else {
                if (tokenResponse.reason) {
                    errorMessage.value = tokenResponse.reason;
                }
            }
        };

        const verify = async () => {
            loading.value = true;

            const verifyResult = await window.api.client.verify({ token: window.api.settings.settings.token.value, code: verificationCode.value });

            if (verifyResult.result === "success") {
                // TODO: store user info
                router.push("/home");
            } else if (verifyResult.reason) {
                window.api.alerts.alert(verifyResult.reason, "error", false, "Verification Failed");
            }

            loading.value = false;
        };
        
        return {
            loading, email, password, remember, requestVerification, verificationMessage, verificationCode, errorMessage,
            login, verify
        };
    }
});
</script>


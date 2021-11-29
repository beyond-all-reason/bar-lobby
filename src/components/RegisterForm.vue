<template>
    <div>
        <Loader v-if="loading" />
        <form v-else-if="!requestVerification" class="login-form" @submit.prevent="register">
            <Textbox type="email" label="Email" v-model="email" required />
            <Textbox label="Username" v-model="username" required />
            <Textbox type="password" label="Password" v-model="password" required />
            <Textbox type="password" label="Confirm Password" v-model="confirmPassword" :validation="validatePassword" required />
            <Button type="submit">Register</Button>
        </form>
        <form v-else @submit.prevent="verify">
            <p>{{ verificationMessage }}</p>
            <Textbox label="Verification Code" v-model="verificationCode" required />
            <Button type="submit">Verify</Button>
        </form>
        <Dialog type="error" v-model="registerError"/>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup() {
        const loading = ref(false);
        const email = ref("");
        const username = ref("");
        const confirmPassword = ref("");
        const password = ref("");
        const requestVerification = ref(false);
        const verificationMessage = ref("");
        const verificationCode = ref("");
        const registerError = ref("");

        const validatePassword = () => {
            if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
                return "Passwords do not match";
            }
        };

        const register = async () => {
            console.log(email.value, password.value);
            const { result: registerResult, reason: registerReason } = await window.client.register({ email: email.value, username: username.value, password: password.value });
            if (registerResult === "success") {
                const { result: tokenResult, reason: tokenReason, token } = await window.client.getToken({ email: email.value, password: password.value });
                if (tokenResult === "success" && token) {
                    const { result: loginResult, reason: loginReason, agreement, user } = await window.client.login({ 
                        token,
                        lobby_name: window.info.lobby.name,
                        lobby_version: window.info.lobby.version,
                        lobby_hash: window.info.lobby.hash
                    });
                    if (loginResult === "unverified" && agreement) {
                        verificationMessage.value = agreement;
                        requestVerification.value = true;
                    }
                } else {
                    if (tokenReason) {
                        registerError.value = tokenReason;
                    }
                }
            } else {
                if (registerReason) {
                    registerError.value = registerReason;
                }
            }
        };

        const verify = () => {
            console.log(verificationCode.value);
        };

        return { 
            loading, email, username, password, confirmPassword,
            requestVerification, verificationMessage, verificationCode,
            registerError,
            register, validatePassword, verify
        };
    }
});
</script>
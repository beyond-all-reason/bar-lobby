<template>
    <div>
        <Loader v-if="loading" />
        <form v-else class="login-form" @submit.prevent="register">
            <Textbox type="email" label="Email" v-model="email" required />
            <Textbox label="Username" v-model="username" required />
            <Textbox type="password" label="Password" v-model="password" required />
            <Textbox type="password" label="Confirm Password" v-model="confirmPassword" :validation="validatePassword" required />
            <p v-if="registerError" class="color--error">{{ registerError }}</p>
            <Button type="submit">Register</Button>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup(props, context) {
        const loading = ref(false);
        const email = ref("");
        const username = ref("");
        const confirmPassword = ref("");
        const password = ref("");
        const registerError = ref("");

        const validatePassword = () => {
            if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
                return "Passwords do not match";
            }
        };

        const register = async () => {
            loading.value = true;

            const registerResponse = await window.client.register({ email: email.value, username: username.value, password: password.value });
            if (registerResponse.result === "success") {
                window.settings.email.value = email.value;
                context.emit("register-success");
            } else {
                if (registerResponse.reason) {
                    registerError.value = registerResponse.reason;
                }
            }

            loading.value = false;
        };

        return {
            loading, email, username, password, confirmPassword,
            registerError,
            register, validatePassword
        };
    }
});
</script>
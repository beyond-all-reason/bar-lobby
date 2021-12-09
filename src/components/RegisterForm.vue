<template>
    <div>
        <Loader v-if="loading" />
        <form v-else @submit.prevent="register" class="flex-col gap-md">
            <p v-if="error" class="color--error">{{ error }}</p>
            <Textbox type="email" label="Email" v-model="email" required />
            <Textbox label="Username" v-model="username" required />
            <Textbox type="password" label="Password" v-model="password" required />
            <Textbox type="password" label="Confirm Password" v-model="confirmPassword" :validation="validatePassword" required />
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
        const error = ref("");

        const validatePassword = () => {
            if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
                return "Passwords do not match";
            }
        };

        const register = async () => {
            loading.value = true;

            const registerResponse = await window.api.client.register({ email: email.value, username: username.value, password: password.value });
            
            if (registerResponse.result === "success") {
                window.api.accounts.model.email.value = email.value;
                window.api.accounts.model.password.value = password.value;
                context.emit("register-success");
            } else {
                if (registerResponse.reason) {
                    error.value = registerResponse.reason;
                }
            }

            loading.value = false;
        };

        return {
            loading, email, username, password, confirmPassword, error,
            register, validatePassword
        };
    }
});
</script>
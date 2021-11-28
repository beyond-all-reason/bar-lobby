<template>
    <div>
        <form v-if="!requestVerification" class="login-form" @submit.prevent="register">
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
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup() {
        const email = ref("");
        const username = ref("");
        const confirmPassword = ref("");
        const password = ref("");
        const requestVerification = ref(false);
        const verificationMessage = ref("");
        const verificationCode = ref("");

        const validatePassword = () => {
            if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
                return "Passwords do not match";
            }
        };

        const register = () => {
            console.log(email.value, password.value);
            requestVerification.value = true;
        };

        const verify = () => {
            console.log(verificationCode.value);
        };

        return { email, username, password, confirmPassword, requestVerification, verificationMessage, verificationCode, register, validatePassword, verify };
    }
});
</script>

<style scoped lang="scss">
</style>
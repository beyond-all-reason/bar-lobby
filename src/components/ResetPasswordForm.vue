<template>
    <form ref="form" class="login-form" @submit.prevent="requestPasswordReset">
        <p>Provide your account's email address <b>or</b> username to request a password reset</p>
        <Textbox type="email" label="Email" v-model="email" :required="!Boolean(username)" />
        <Textbox label="Username" v-model="username" :required="!Boolean(email)" />
        <Button type="submit">Request Password Reset</Button>
    </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup() {
        const email = ref("");
        const username = ref("");

        const requestPasswordReset = () => {
            console.log(email.value, username.value);
        };

        return { email, username, requestPasswordReset };
    }
});
</script>


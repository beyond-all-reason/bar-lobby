<template>
    <form ref="form" class="login-form hidden" @submit.prevent="register">
        <Textbox type="email" label="Email" v-model="email" required />
        <Textbox label="Username" v-model="username" required />
        <Textbox type="password" label="Password" v-model="password" required />
        <Textbox type="password" label="Confirm Password" v-model="confirmPassword" required />
        <div class="row">
            <Button type="submit">Register</Button>
        </div>
    </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup() {
        const email = ref("");
        const username = ref("");
        const confirmPassword = ref("");
        const password = ref("");
        const remember = ref(false);

        const register = () => {
            console.log(email.value, password.value);
        };

        return { email, username, password, confirmPassword, remember, register };
    }
});
</script>

<style scoped lang="scss">
</style>
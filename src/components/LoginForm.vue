<template>
    <form ref="form" class="login-form" @submit.prevent="login">
        <Textbox type="email" label="Email" v-model="email" required validate />
        <Textbox type="password" label="Password" v-model="password" required />
        <div class="flex-row gap-md">
            <Checkbox type="checkbox" label="Remember Me" v-model="remember" />
            <Button type="submit">Login</Button>
        </div>
    </form>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    setup() {
        const email = ref("");
        const password = ref("");
        const remember = ref(false);

        const login = () => {
            console.log(email.value, password.value, remember.value);
        };

        // if (!token) {
        //     window.client.getToken({ email: "test@test2.com", password: "test" });
        // }

        return { email, password, remember, login };
    }
});
</script>

<style scoped lang="scss">
</style>
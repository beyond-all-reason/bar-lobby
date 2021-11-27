<template>
    <form ref="form" class="login-form hidden">
        <Textbox type="email" label="Email" v-model="email" required />
        <Textbox type="password" label="Password" v-model="password" required />
        <div class="row">
            <Button @click="login">Login</Button>
            <Checkbox type="checkbox" label="Remember Me" v-model="remember" />
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
            console.log(email.value, password.value);
        };

        return { email, password, remember, login };
    }
});
</script>

<style scoped lang="scss">
</style>
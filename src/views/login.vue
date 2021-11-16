<template>
    <div class="fullsize">
        <div class="login">
            <img class="logo" src="@/assets/images/BARLogoFull.png">
            <Panel class="login-form">
                <Textbox class="email" label="Email" v-model="email" />
                <Textbox class="password" type="password" label="Password" v-model="password" />
                <div class="row">
                    <Button>Login</Button>
                    <Button>Register</Button>
                    <Checkbox type="checkbox" label="Remember Me" v-model="remember" />
                </div>
            </Panel>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "fade"
        }
    },
    setup() {
        const email = ref("");
        const password = ref("");
        const remember = ref(false);

        return { email, password, remember };
    }
});
</script>

<style scoped lang="scss">
.fullsize {
    justify-content: center;
    align-items: center;
}
.login {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 500px;
    margin-bottom: 100px;
    gap: 80px;
}
.login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 400px;
} 
.email, .password {
    width: 100%;
}
.row {
    display: flex;
    gap: 10px;
}
</style>
<template>
    <div class="fullsize">
        <div class="login">
            <transition name="login" appear>
                <img ref="logo" class="logo hidden" src="@/assets/images/BARLogoFull.png">
            </transition>
            <transition name="login" appear>
                <Panel>
                    <Panel is="form" ref="form" class="login-form hidden" title="login">
                        <Textbox type="email" class="email" label="Email" v-model="email" required />
                        <Textbox class="password" type="password" label="Password" v-model="password" required />
                        <div class="row">
                            <Button @click="login">Login</Button>
                            <Button>Register</Button>
                            <Checkbox type="checkbox" label="Remember Me" v-model="remember" />
                        </div>
                    </Panel>
                    <Panel is="form" ref="form" class="login-form hidden" title="register">
                        <Textbox type="email" class="email" label="Email" v-model="email" required />
                        <Textbox class="password" type="password" label="Password" v-model="password" required />
                        <div class="row">
                            <Button @click="login">Login</Button>
                            <Button>Register</Button>
                            <Checkbox type="checkbox" label="Remember Me" v-model="remember" />
                        </div>
                    </Panel>
                </Panel>
            </transition>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from "vue";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "fade",
        }
    },
    setup() {
        const email = ref("");
        const password = ref("");
        const remember = ref(false);
        const form = ref(null) as unknown as Ref<HTMLFormElement>;

        const validate = (event: MouseEvent, valid: boolean) => {
            //emailValid.value = valid;
            //console.log(emailValid.value, event, test);
            //console.log(email.value, password.value);
        };

        const login = () => {
            console.log(form.value);
            //console.log(email.value, password.value);
        };

        return { email, password, remember, validate, login, form };
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
.email, .password {
    width: 100%;
}
</style>
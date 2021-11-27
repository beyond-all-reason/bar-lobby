<template>
    <div class="fullsize">
        <div class="login">
            <transition name="login" appear>
                <img ref="logo" class="logo hidden" src="@/assets/images/BARLogoFull.png">
            </transition>
            <transition name="login" appear>
                <Panel>
                    <Tab title="Login">
                        <LoginForm />
                    </Tab>
                    <Tab title="Register">
                        <RegisterForm />
                    </Tab>
                </Panel>
            </transition>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "fade",
        }
    },
    setup() {
        return {};
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
    gap: 80px;
}
</style>
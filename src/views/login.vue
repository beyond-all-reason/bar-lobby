<route lang="json">
{ "meta": { "empty": true, "blurBg": true } }
</route>

<template>
    <div>
        <teleport to="#wrapper">
            <div class="fullsize flex-col flex-center-items">
                <Loader v-if="loading" />
                <transition v-else name="login" appear>
                    <div class="login">
                        <img ref="logo" class="login__logo" src="@/assets/images/BARLogoFull.png" />
                        <Panel v-model:activeTabIndex="activeTab" class="login__panel">
                            <Tab title="Login">
                                <LoginForm />
                            </Tab>
                            <Tab title="Register">
                                <RegisterForm @register-success="activeTab = 0" />
                            </Tab>
                            <Tab title="Reset Password">
                                <ResetPasswordForm />
                            </Tab>
                        </Panel>
                    </div>
                </transition>
            </div>
        </teleport>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";

import Loader from "@/components/common/Loader.vue";
import Panel from "@/components/common/Panel.vue";
import Tab from "@/components/common/Tab.vue";
import LoginForm from "@/components/login/LoginForm.vue";
import RegisterForm from "@/components/login/RegisterForm.vue";
import ResetPasswordForm from "@/components/login/ResetPasswordForm.vue";

const loading = ref(false);
const activeTab = ref(0);

onMounted(async () => {
    // TODO: fallback to offline mode if connect fails
    await api.client.connect();
});
</script>

<style lang="scss" scoped>
.login {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: calc((100vh - 700px) / 2);
    width: 500px;
    gap: 80px;
    &__logo {
        filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
        transition: 2000ms ease;
    }
    &__panel {
        width: 100%;
        transition: 1700ms ease;
        transition-delay: 300ms;
    }
}

.login-enter-from,
.login-leave-to {
    .login__logo,
    .login__panel {
        transform: translateY(-25px);
        opacity: 0;
    }
}
</style>

<route lang="json">{ "meta": { "empty": true, "blurBg": true } }</route>

<template>
    <div>
        <teleport to=".theme">
            <div class="fullsize flex-col flex-center-items">
                <Loader v-if="loading" />
                <transition v-else name="login" appear>
                    <div class="login">
                        <img ref="logo" class="login__logo" src="@/assets/images/BARLogoFull.png">
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
import { ref, onMounted } from "vue";
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
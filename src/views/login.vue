<template>
    <teleport to=".theme">
        <div class="fullsize flex-col flex-center-items" style="z-index: 1">
            <Loader v-if="loading" />
            <div v-else class="login">
                <transition name="login" appear>
                    <img ref="logo" class="logo hidden" src="@/assets/images/BARLogoFull.png">
                </transition>
                <transition name="login" appear>
                    <Panel v-model:activeTab="activeTab">
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
                </transition>
            </div>
        </div>
    </teleport>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import Loader from "@/components/common/Loader.vue";
import Panel from "@/components/common/Panel.vue";
import Tab from "@/components/common/Tab.vue";
import LoginForm from "@/components/LoginForm.vue";
import RegisterForm from "@/components/RegisterForm.vue";
import ResetPasswordForm from "@/components/ResetPasswordForm.vue";

const loading = ref(false);
const activeTab = ref(0);

onMounted(async () => {
    await window.api.client.connect();
});
</script>
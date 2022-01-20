<template>
    <div class="fullsize flex-col flex-center-items">
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
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";

export default defineComponent({
    layout: {
        name: "default",
        props: {
            empty: true,
            transitionName: "fade",
        }
    }
});
</script>

<script lang="ts" setup>
import { ref } from "vue";

const loading = ref(false);
const activeTab = ref(0);

onMounted(async () => {
    await window.api.client.connect();
});
</script>
<template>
    <div class="fullsize">
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
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "fade",
        }
    },
    setup() {
        const router = useRouter();
        const loading = ref(true);
        const activeTab = ref(0);

        //ipcRenderer.invoke("getVersion").then((version => console.log(version)));

        const token = window.settings.token?.value;
        if (token) {
            window.client.login({
                token,
                lobby_name: window.info.lobby.name,
                lobby_version: window.info.lobby.version,
                lobby_hash: window.info.lobby.hash
            }).then(data => {
                if (data.result === "success") {
                    router.push("/home");
                } else {
                    loading.value = false;
                }
            });
        } else {
            loading.value = false;
        }

        return { loading, activeTab };
    }
});
</script>

<style scoped lang="scss">
.fullsize {
    align-items: center;
}
.login {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 500px;
    gap: 80px;
    margin-top: 10%;
}
</style>
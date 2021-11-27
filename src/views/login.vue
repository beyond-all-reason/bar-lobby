<template>
    <div class="fullsize">
        <div class="login">
            <transition name="login" appear>
                <img ref="logo" class="logo hidden" src="@/assets/images/BARLogoFull.png">
            </transition>
            <suspense>
                <transition name="login" appear>
                    <Loader v-if="loading" />
                    <Panel v-else>
                        <Tab title="Login">
                            <LoginForm />
                        </Tab>
                        <Tab title="Register">
                            <RegisterForm />
                        </Tab>
                    </Panel>
                </transition>
            </suspense>
        </div>
    </div>
</template>

<script lang="ts">
import { ipcRenderer } from "electron";
import { defineComponent, ref } from "vue";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "fade",
        }
    },
    setup() {
        const loading = ref(true);

        ipcRenderer.invoke("getVersion").then((version => console.log(version)));

        const token = localStorage.getItem("token");
        if (token) {
            window.client.login({ token, lobby_name: "BAR Lobby", lobby_version: "" });
        }

        return { loading };
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
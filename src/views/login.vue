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
import { defineComponent } from "vue";

export default defineComponent({
    layout: {
        name: "default",
        props: {
            transition: "fade",
            empty: true
        }
    }
});
</script>

<script lang="ts" setup>
/**
 * TODO
 * refactor this to be an async component inside <suspense> where the fallback slot is a loader anim
 * maybe don't attempt to connect to server until player actually logs in?
 * need to support offline mode, maybe as tab button?
 */

import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const loading = ref(true);
const activeTab = ref(0);

onMounted(async () => {
    if (window.api.client.isLoggedIn()) {
        await router.replace("/home");
    } else {
        try {
            await window.api.client.connect();

            if (window.api.accounts.model.token.value) {
                const loginData = await window.api.client.login({
                    token: window.api.accounts.model.token.value,
                    lobby_name: window.info.lobby.name,
                    lobby_version: window.info.lobby.version,
                    lobby_hash: window.info.lobby.hash
                });
            }
        } catch (error) {
            console.error(error);
        }

        await router.replace("/home");
    }
});
</script>
<template>
    <Modal ref="modal" title="Exit">
        <div class="flex-row gap-md">
            <Button @click="login" v-if="!me.isAuthenticated && !onLoginPage">Login</Button>
            <Button @click="logout" v-if="me.isAuthenticated && !onLoginPage">Logout</Button>
            <Button @click="quitToDesktop">Quit to Desktop</Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";

import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { auth } from "@renderer/store/me.store";
import { settingsStore } from "@renderer/store/settings.store";
import { me } from "@renderer/store/me.store";

const router = useRouter();
const modal: Ref<InstanceType<typeof Modal> | null> = ref(null);
const currentRoute = router.currentRoute;

const onLoginPage = computed(() => currentRoute.value.path === "/");

async function login() {
    await router.push("/");
    modal.value?.close();
}

async function logout() {
    auth.logout();
    settingsStore.loginAutomatically = false;
    await router.push("/");
    modal.value?.close();
}

async function quitToDesktop() {
    window.close();
}
</script>

<style lang="scss" scoped></style>

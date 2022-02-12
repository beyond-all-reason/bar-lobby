<template>
    <Modal name="Exit">
        <div class="flex-row gap-md">
            <Button @click="logout">Logout</Button>
            <Button @click="quitToDesktop">Quit to Desktop</Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";
import { api } from "@/api/api";

const router = useRouter();

const logout = async () => {
    api.accounts.model.token.value = "";
    await api.client.disconnect();
    api.modals.close("exit");
    router.push("/login");
};

const quitToDesktop = async () => {
    api.modals.close("exit");
    window.close();
};
</script>
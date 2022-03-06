<template>
    <Modal name="exit">
        <div class="flex-row gap-md">
            <Button @click="logout">
                Logout
            </Button>
            <Button @click="quitToDesktop">
                Quit to Desktop
            </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import Modal from "@/components/common/Modal.vue";
import Button from "@/components/inputs/Button.vue";

const router = useRouter();

const logout = async () => {
    window.api.account.model.token.value = "";
    try {
        await window.api.client.disconnect();
    } catch (err) {
        console.error(err);
    }
    window.api.modals.close("exit");
    router.push("/login");
};

const quitToDesktop = async () => {
    window.api.modals.close("exit");
    window.close();
};
</script>
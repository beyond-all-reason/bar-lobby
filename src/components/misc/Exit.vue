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
    api.account.model.token.value = "";
    try {
        await api.client.request("c.auth.disconnect", {});
    } catch (err) {
        console.error(err);
    }
    api.modals.close("exit");
    router.push("/login");
};

const quitToDesktop = async () => {
    api.modals.close("exit");
    window.close();
};
</script>

<style lang="scss" scoped>

</style>
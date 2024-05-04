<template>
    <Modal ref="modal" title="Exit">
        <div class="flex-row gap-md">
            <Button @click="logout"> Logout </Button>
            <Button @click="quitToDesktop"> Quit to Desktop </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";
import { useRouter } from "vue-router";

import Modal from "@/components/common/Modal.vue";
import Button from "@/components/controls/Button.vue";

const router = useRouter();
const modal: Ref<InstanceType<typeof Modal> | null> = ref(null);

async function logout() {
    api.account.model.token = "";
    try {
        if (!api.session.offlineMode.value) {
            await api.comms.request("system", "disconnect");
        }
    } catch (err) {
        console.error(err);
    }
    api.settings.model.loginAutomatically = false;
    await router.push("/login");
    modal.value?.close();
}

async function quitToDesktop() {
    window.close();
}
</script>

<style lang="scss" scoped></style>

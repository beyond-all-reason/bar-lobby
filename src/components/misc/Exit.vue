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
import Button from "@/components/inputs/Button.vue";

const router = useRouter();
const modal: Ref<InstanceType<typeof Modal> | null> = ref(null);

const logout = async () => {
    api.account.model.token.value = "";
    try {
        await api.comms.request("c.auth.disconnect", {});
    } catch (err) {
        console.error(err);
    }
    router.push("/login");
    modal.value?.close();
};

const quitToDesktop = async () => {
    window.close();
};
</script>

<style lang="scss" scoped></style>

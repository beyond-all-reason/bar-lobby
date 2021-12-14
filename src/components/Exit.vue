<template>
    <Modal name="Exit">
        <div class="flex-row gap-md">
            <Button @click="logout">Logout</Button>
            <Button @click="quitToDesktop">Quit to Desktop</Button>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const router = useRouter();

        const logout = async () => {
            window.api.accounts.model.token.value = "";
            await window.api.client.disconnect();
            window.api.modals.close("exit");
            router.push("/login");
        };

        const quitToDesktop = async () => {
            window.api.modals.close("exit");
            window.close();
        };

        return { logout, quitToDesktop };
    }
});
</script>
<template>
    <div>
        <Button @click="go">Go</Button>
    </div>
</template>

<script lang="ts" setup>
import Button from "@/components/controls/Button.vue";
import Password from "@/components/prompts/Password.vue";
import { useDialog } from "@/composables/useDialog";

async function go() {
    const { reveal, onConfirm, onCancel } = useDialog(Password);
    reveal();

    onConfirm((data) => {
        console.log(data); // { name: 'Auswuchs' }
    });
    onCancel((data) => {
        console.log(data); // { number: 123 }
    });
}
</script>

<style lang="scss" scoped></style>

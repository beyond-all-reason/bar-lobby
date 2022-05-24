<template>
    <Modal :name="name" @close="promptCancel">
        <form @submit.prevent="onSubmit">
            <slot />
        </form>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";

const props = defineProps<{
    name: string;
}>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onSubmit = (event: any) => {
    const data: Record<string, unknown> = {};
    const fields = Array.from(event.target.elements) as any;
    for (const field of fields) {
        if (field.name !== undefined && field.value !== undefined) {
            data[field.name] = field.value;
        }
    }

    api.modals.onPromptSubmit.dispatch(data);
};

const promptCancel = () => {
    api.modals.onPromptCancel.dispatch();
};
</script>

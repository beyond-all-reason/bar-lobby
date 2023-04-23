<template>
    <div class="dialog">
        <div class="dialog-content">
            <component :is="component" @submit="onSubmit" @cancel="onCancel"></component>
        </div>
    </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
    component: any;
}>();

const emits = defineEmits<{
    (event: "submit", data: any): void;
    (event: "cancel"): void;
}>();

function onSubmit(data) {
    emits("submit", data);
}

function onCancel() {
    emits("cancel");
}
</script>

<style lang="scss" scoped>
.dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.dialog-content {
    background-color: white;
    padding: 1rem;
    max-width: 400px;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 0.25rem;
}
</style>

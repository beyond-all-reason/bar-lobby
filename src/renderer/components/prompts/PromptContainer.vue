<template>
    <transition name="modal">
        <div v-if="promptRef" class="container">
            <Panel class="modal-panel">
                <template #header>
                    <div class="title">
                        <slot name="title"> {{ promptRef.title }} </slot>
                    </div>
                    <div class="close" @click="close" @mouseenter="sound">
                        <Icon :icon="closeThick" height="23" />
                    </div>
                </template>

                <component :is="promptRef.component" ref="promptInstance" />

                <template #footer>
                    <slot name="footer"></slot>
                </template>
            </Panel>
        </div>
    </transition>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";
import { ref, watch } from "vue";

import { promptRef } from "@/api/prompt";
import Panel from "@/components/common/Panel.vue";

const promptInstance = ref();
watch(promptInstance, () => {
    if (promptInstance.value && promptRef.value) {
        promptRef.value.componentInstance = promptInstance.value;
    }
});

function close() {
    promptRef.value?.close();
}

function sound() {
    return api.audio.play("button-hover");
}
</script>

<script lang="ts">
export default {
    name: "DialogContainer",
    components: { Panel },
};
</script>

<style lang="scss" scoped>
.container {
    position: fixed;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(200, 215, 255, 0);
    backdrop-filter: blur(3px);
    z-index: 99;
}
.modal-panel {
    flex-grow: 0;
    background: rgba(0, 0, 0, 0.5);
}
.title {
    padding: 5px 10px;
    flex-grow: 1;
    text-transform: capitalize;
    font-weight: 600;
}
.close {
    display: flex;
    margin-left: auto;
    padding: 5px 10px;
    &:hover {
        background: rgba(219, 20, 20, 0.6);
    }
}
.modal-enter-active,
.modal-leave-active {
    transition: 0.2s ease-in-out;
    .modal {
        transition: 0.2s ease-in-out;
    }
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    .modal {
        transform: translateY(-20px);
    }
}
</style>

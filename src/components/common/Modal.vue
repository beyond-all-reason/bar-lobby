<template>
    <teleport to="#wrapper">
        <transition name="modal" appear>
            <div v-if="isOpen" class="modal-container">
                <Panel id="modal" class="modal" v-bind="$attrs">
                    <template #header>
                        <div class="modal__title">
                            {{ title || name }}
                        </div>
                        <div class="modal__close" @click="close" @mouseenter="sound">
                            <Icon :icon="closeThick" height="23" />
                        </div>
                    </template>
                    <slot />
                </Panel>
            </div>
        </transition>
    </teleport>
</template>

<script lang="ts">
export default {
    inheritAttrs: false,
};
</script>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";
import { watch } from "vue";

import Panel from "@/components/common/Panel.vue";

type PanelProps = InstanceType<typeof Panel>["$props"];
interface ModalProps extends PanelProps {
    name: string;
    title?: string;
}

const props = withDefaults(defineProps<ModalProps>(), {
    title: undefined,
    is: "div",
    width: "initial",
    height: "initial",
    padding: "30px",
    activeTab: 0,
});

const emit = defineEmits<{
    (event: "open"): void;
    (event: "close"): void;
}>();

const isOpen = api.modals.register(props.name);

watch(isOpen, (isOpen) => {
    if (isOpen) {
        emit("open");
    }
});

const close = () => {
    api.modals.close(props.name);
    emit("close");
};

const sound = () => api.audio.getSound("button-hover").play();
</script>

<style lang="scss" scoped>
.modal-container {
    @extend .fullsize;
    z-index: 10;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
}
.modal {
    flex-grow: 0;
    background: rgba(0, 0, 0, 0.5);
    max-width: 800px;
    :deep(.panel.tabbed),
    :deep(.panel.tabbed:after) {
        background: none;
        backdrop-filter: none;
        border: none;
        box-shadow: none;
    }
    &__title {
        padding: 5px 10px;
        flex-grow: 1;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        text-transform: capitalize;
        font-weight: 600;
    }
    &__close {
        margin-left: auto;
        padding: 5px 10px;
        background: rgba(219, 20, 20, 0.3);
        &:hover {
            background: rgba(219, 20, 20, 0.6);
        }
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

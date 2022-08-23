<template>
    <teleport to="#wrapper">
        <transition name="modal" appear>
            <form v-if="open" ref="form" class="modal-container" v-bind="$attrs" @submit.prevent="onSubmit" @keydown.enter="onSubmit">
                <Panel id="modal" class="modal" v-bind="$attrs">
                    <template #header>
                        <div class="modal__title">
                            <slot name="title">
                                {{ title }}
                            </slot>
                        </div>
                        <div class="modal__close" @click="close" @mouseenter="sound">
                            <Icon :icon="closeThick" height="23" />
                        </div>
                    </template>
                    <slot />
                </Panel>
            </form>
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
import { nextTick, Ref, ref, toRef, watch } from "vue";

import Panel from "@/components/common/Panel.vue";

type PanelProps = InstanceType<typeof Panel>["$props"];
interface ModalProps extends PanelProps {
    modelValue: boolean;
    title?: string;
}

const props = withDefaults(defineProps<ModalProps>(), {
    modelValue: false,
    title: undefined,
    is: "div",
    width: "initial",
    height: "initial",
    padding: "30px",
    activeTab: 0,
});

const emits = defineEmits<{
    (event: "update:modelValue", open: boolean): void;
    (event: "submit", data: Record<string, unknown>): Promise<boolean | string>;
    (event: "open"): void;
    (event: "close"): void;
}>();

const form: Ref<HTMLFormElement | null> = ref(null);
const open = toRef(props, "modelValue");

defineExpose({
    open: () => emits("update:modelValue", true),
    close: () => emits("update:modelValue", false),
});

const close = () => {
    emits("update:modelValue", false);
};

watch(open, (open) => {
    if (open) {
        nextTick(() => form.value?.querySelector("input")?.focus());
        emits("open");
    } else {
        emits("close");
    }
});

const onSubmit = async () => {
    const data: Record<string, unknown> = {};

    if (!form.value?.elements) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields = Array.from(form.value.elements) as any;
    for (const field of fields) {
        if (field.name !== undefined && field.value !== undefined) {
            data[field.name] = field.value;
        }
    }
    await emits("submit", data);
};

const sound = () => api.audio.getSound("button-hover").play();
</script>

<style lang="scss" scoped>
.modal-container {
    @extend .fullsize;
    left: 0;
    top: 0;
    z-index: 5;
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
        //border-right: 1px solid rgba(255, 255, 255, 0.1);
        text-transform: capitalize;
        font-weight: 600;
    }
    &__close {
        display: flex;
        margin-left: auto;
        padding: 5px 10px;
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

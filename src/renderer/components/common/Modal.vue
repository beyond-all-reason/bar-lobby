<template>
    <Teleport v-if="isLoaded" to="#wrapper">
        <form v-if="isOpen" ref="form" class="container" @submit.prevent="onSubmit" @keydown.enter="onSubmit">
            <Panel id="modal" class="modal-panel" v-bind="$attrs">
                <template #header>
                    <div class="title">
                        <slot name="title">
                            {{ title }}
                        </slot>
                    </div>
                    <div class="close" @click="close" @mouseenter="sound">
                        <Icon :icon="closeThick" height="23" />
                    </div>
                </template>
                <slot />
                <template #footer>
                    <slot name="footer"></slot>
                </template>
            </Panel>
        </form>
    </Teleport>
</template>

<script lang="ts">
export default {
    inheritAttrs: false,
};
</script>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import closeThick from "@iconify-icons/mdi/close-thick";
import { nextTick, onMounted, Ref, ref, toRef, watch } from "vue";

import Panel from "@renderer/components/common/Panel.vue";
import { audioApi } from "@renderer/audio/audio";

export type PanelProps = InstanceType<typeof Panel>["$props"];
export interface ModalProps extends /* @vue-ignore */ PanelProps {
    modelValue?: boolean;
    title?: string;
}

const isLoaded = ref(false);
onMounted(() => {
    isLoaded.value = true;
});

const props = withDefaults(defineProps<ModalProps>(), {
    modelValue: false,
    title: undefined,
    is: "div",
    activeTab: 0,
});

const emits = defineEmits<{
    (event: "update:modelValue", open: boolean): void;
    (event: "submit", data: Record<string, unknown>): Promise<boolean | string>;
    (event: "open"): void;
    (event: "close"): void;
}>();

const form: Ref<HTMLFormElement | null> = ref(null);
const isOpen = toRef(props, "modelValue");

defineExpose({
    open: () => emits("update:modelValue", true),
    close: () => emits("update:modelValue", false),
});

function close() {
    emits("update:modelValue", false);
}

watch(isOpen, (open) => {
    if (open) {
        nextTick(() => form.value?.querySelector("input")?.focus());
        emits("open");
    } else {
        emits("close");
    }
});

async function onSubmit() {
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
}

function sound() {
    return audioApi.play("button-hover");
}
</script>

<style lang="scss" scoped>
.container {
    @extend .fullsize;
    left: 0;
    top: 0;
    z-index: 5;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
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

<template>
    <teleport to=".theme">
        <transition name="modal" appear>
            <div v-if="isOpen" class="modal-container" v-bind="$attrs">
                <Panel id="modal" class="modal" :title="titleStr">
                    <template #header>
                        <div class="panel__header">
                            <div class="panel__title">{{ title || name }}</div>
                            <div class="panel__close" @click="close" @mouseenter="sound">
                                <Icon icon="close-thick" />
                            </div>
                        </div>
                    </template>
                    <slot></slot>
                </Panel>
            </div>
        </transition>
    </teleport>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Panel from "@/components/common/Panel.vue";
import Icon from "@/components/common/Icon.vue";

const props = defineProps({
    name: {
        type: String,
        required: true
    },
    title: String,
});

const isOpen = window.api.modals.register(props.name);
const titleStr = ref(props.title || props.name);

const close = () => {
    window.api.modals.close(props.name);
};

const sound = () => window.api.audio.getSound("button-hover").play();
</script>
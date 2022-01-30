<template>
    <teleport v-if="isOpen" to=".theme">
        <div class="modal-container" v-bind="$attrs">
            <Panel id="modal" class="modal" :title="title">
                <template #header>
                    <div class="header">
                        <div class="title">{{ title }}</div>
                        <div class="close" @click="close"><Icon icon="close-thick" /></div>
                    </div>
                </template>
                <slot/>
            </Panel>
        </div>
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
    title: {
        type: String,
        default: "",
    },
});

const isOpen = window.api.modals.register(props.name);
const title = ref(props.title || props.name);

const close = () => {
    window.api.modals.close(props.name);
};
</script>
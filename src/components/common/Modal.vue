<template>
    <teleport v-if="!disabled" to=".theme">
        <div class="modal-container" v-bind="$attrs">
            <Panel id="modal" class="modal" :title="title">
                <template #header>
                    <div class="header">
                        <div class="title" v-if="title">{{ title }}</div>
                        <div class="close" @click="$emit('close')"><Icon icon="close-thick" /></div>
                    </div>
                </template>
                <slot/>
            </Panel>
        </div>
    </teleport>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs } from "vue";

export default defineComponent({
    props: {
        disabled: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: "",
        },
    },
    setup(props) {
        const disabled = ref(props.disabled);
        const { title } = toRefs(props);

        return { disabled, title };
    }
});
</script>
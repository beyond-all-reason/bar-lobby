<template>
    <teleport v-if="!test" to="#view">
        <div class="modal-container" v-bind="$attrs">
            <Panel id="modal" class="modal" :title="title">
                <template #header>
                    <div v-if="title" class="header">
                        <div class="title">{{ title }}</div>
                        <div class="close" @click="test = true"><Icon icon="close-thick" /></div>
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
        const test = ref(props.disabled);
        const { title } = toRefs(props);

        return { test, title };
    }
});
</script>
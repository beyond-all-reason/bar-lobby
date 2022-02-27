<template>
    <Popper v-if="content" v-bind="$attrs" hover openDelay="0" closeDelay="0" offsetDistance="5" :interactive="false" :content="content" class="tooltip">
        <slot></slot>
        <template #content="props">
            <slot name="content" v-bind="props"></slot>
        </template>
    </Popper>
    <slot v-else v-bind="$attrs"></slot>
</template>

<script lang="ts" setup>
import Popper from "vue3-popper";

const props = defineProps<{
    content?: string;
}>();
</script>
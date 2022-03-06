<template>
    <Popper v-if="content" v-bind="$attrs" hover open-delay="0" close-delay="0" offset-distance="5" :interactive="false" :content="content" class="tooltip">
        <slot />
        <template #content="contentProps">
            <slot name="content" v-bind="contentProps" />
        </template>
    </Popper>
    <slot v-else v-bind="$attrs" />
</template>

<script lang="ts" setup>
import Popper from "vue3-popper";

const props = defineProps<{
    content?: string;
}>();
</script>
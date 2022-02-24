<template>
    <Popper v-bind="$attrs" hover openDelay="0" closeDelay="0" offsetDistance="5" :interactive="false">
        <slot />
        <template #content="props">
            <slot name="content" v-bind="props" />
        </template>
    </Popper>
</template>

<script lang="ts" setup>
import Popper from "vue3-popper";
</script>
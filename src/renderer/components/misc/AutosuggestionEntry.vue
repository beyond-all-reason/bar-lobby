<template>
    <div>
        <h3>{{ props.command }}</h3>
        <p>{{ props.description }}</p>
        <input type="text" list="test" />
        <datalist id="test">
            <option>hello</option>
        </datalist>
    </div>
</template>
<script lang="ts" setup>
const props = defineProps<{
    command: string;
    description: string;
}>();
</script>
<style lang="scss" scoped></style>

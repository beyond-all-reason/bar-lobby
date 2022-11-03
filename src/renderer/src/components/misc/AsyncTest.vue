<template>
    <div>
        <Suspense @pending="pending" @fallback="fallback" @resolve="resolve">
            <template #default>
                <slot />
            </template>
            <template #fallback>
                <div>Loading...</div>
            </template>
        </Suspense>
    </div>
</template>

<script lang="ts" setup>
const pending = () => {
    console.log("pending");
};

const fallback = () => {
    console.log("fallback");
};

const resolve = () => {
    console.log("resolve");
};
</script>

<style lang="scss" scoped></style>

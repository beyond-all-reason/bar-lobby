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
function pending() {
    console.log("pending");
}

function fallback() {
    console.log("fallback");
}

function resolve() {
    console.log("resolve");
}
</script>

<style lang="scss" scoped></style>

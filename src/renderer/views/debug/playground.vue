<route lang="json5">
{ meta: { title: "Playground", order: 1 } }
</route>

<template>
    <div>
        <div class="a"></div>
        <div v-in-view="() => inView()">Hello world</div>
        <div class="a"></div>
    </div>
</template>

<script lang="ts" setup>
function inView() {
    console.log("Yep!");
}
</script>

<style lang="scss" scoped>
.a {
    background: green;
    width: 50px;
    height: 1000px;
}
</style>

<route lang="json5">
{ meta: { title: "Scenarios", order: 1, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>

        <Button @click="test"></Button>
    </div>
</template>

<script lang="ts" setup>
import Button from "@/components/controls/Button.vue";

const route = api.router.currentRoute.value;

function test() {
    // const battle = new OfflineBattle({
    //     battleOptions: {
    //         engineVersion: ""
    //     }
    // });
    // api.game.launch(battle);
}
</script>

<style lang="scss" scoped></style>

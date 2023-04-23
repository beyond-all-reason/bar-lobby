<template>
    <div>
        <Button @click="go">Go</Button>
    </div>
</template>

<script lang="ts" setup>
import Button from "@/components/controls/Button.vue";
import Password from "@/components/prompts/Password.vue";

async function go() {
    const data = await api.prompt.open({
        component: Password,
        title: "Battle Password",
    });

    console.log(data);
}
</script>

<style lang="scss" scoped></style>

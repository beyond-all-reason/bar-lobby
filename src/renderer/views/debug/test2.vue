<template>
    <div>
        <Button @click="go">Go</Button>
    </div>
</template>

<script lang="ts" setup>
import { DefineComponent } from "vue";

import Button from "@/components/controls/Button.vue";
import Password from "@/components/prompts/Password.vue";

type BindingReturnType<C extends DefineComponent<any, any, any>> = C extends DefineComponent<any, infer X, any> ? X : never;
type A = BindingReturnType<typeof Password>;

async function go() {
    const data = await api.prompt.open({
        component: Password,
        title: "Battle Password",
    });

    console.log(data);
}
</script>

<style lang="scss" scoped></style>

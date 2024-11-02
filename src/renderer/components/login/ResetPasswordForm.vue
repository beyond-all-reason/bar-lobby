<template>
    <form ref="form" class="flex-col gap-md" @submit.prevent="requestPasswordReset">
        NOT IMPLEMENTED
        <p>Provide your account's email address <b>or</b> username to request a password reset</p>
        <Textbox
            v-model="email"
            type="email"
            label="Email"
            :required="!Boolean(username)"
            class="fullwidth"
            :disabled="Boolean(username)"
        />
        <Textbox v-model="username" label="Username" :required="!Boolean(email)" class="fullwidth" :disabled="Boolean(email)" />
        <Button type="submit" class="blue"> Request Password Reset </Button>
    </form>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";

const email = ref("");
const username = ref("");

function requestPasswordReset() {
    console.log(email.value, username.value);
}
</script>

<style lang="scss" scoped></style>

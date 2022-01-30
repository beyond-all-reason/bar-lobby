<template>
    <form ref="form" @submit.prevent="requestPasswordReset" class="flex-col gap-md">
        NOT IMPLEMENTED
        <p>Provide your account's email address <b>or</b> username to request a password reset</p>
        <Textbox type="email" label="Email" v-model="email" :required="!Boolean(username)" />
        <Textbox label="Username" v-model="username" :required="!Boolean(email)" />
        <Button type="submit">Request Password Reset</Button>
    </form>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Textbox from "@/components/inputs/Textbox.vue";

const email = ref("");
const username = ref("");

const requestPasswordReset = () => {
    console.log(email.value, username.value);
};
</script>


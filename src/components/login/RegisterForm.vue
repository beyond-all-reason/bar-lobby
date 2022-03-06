<template>
    <div>
        <Loader v-if="loading" />
        <form v-else class="flex-col gap-md" @submit.prevent="register">
            <p v-if="error" class="color--error">
                {{ error }}
            </p>
            <Textbox v-model="email" type="email" label="Email" required />
            <Textbox v-model="username" label="Username" required />
            <Textbox v-model="password" type="password" label="Password" required />
            <Textbox v-model="confirmPassword" type="password" label="Confirm Password" :validation="validatePassword" required />
            <Button type="submit">
                Register
            </Button>
        </form>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Loader from "@/components/common/Loader.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Button from "@/components/inputs/Button.vue";

const emit = defineEmits(["register-success"]);

const loading = ref(false);
const email = ref("");
const username = ref("");
const confirmPassword = ref("");
const password = ref("");
const error = ref("");

const validatePassword = () => {
    if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
        return "Passwords do not match";
    }
};

const register = async () => {
    loading.value = true;

    const registerResponse = await window.api.client.register({ email: email.value, username: username.value, password: password.value });

    if (registerResponse.result === "success") {
        window.api.account.model.email.value = email.value;
        emit("register-success");
    } else {
        if (registerResponse.reason) {
            error.value = registerResponse.reason;
        }
    }

    loading.value = false;
};
</script>
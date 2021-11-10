<template>
    <div class="login-form">
        <div class="input">
            <label>Email</label>
            <input type="text">
        </div>
        <div class="input">
            <label>Password</label>
            <input type="password">
        </div>

        <div class="buttons">
            <Button>
                Register
            </Button>
            <Button>
                Login
            </Button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        return {};
    }
});
</script>

<style scoped lang="scss">
.login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 400px;
}
label {
    font-size: 20px;
    font-weight: 200;
}
.input {
    display: flex;
    flex-direction: column;
}
input[type=text], input[type=password] {
    width: 100%;
    font-size: 24px;
    padding: 10px 10px;
}

.buttons {
    display: flex;
    gap: 10px;
}
</style>
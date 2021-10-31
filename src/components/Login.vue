<template>
    <div class="login">
        <img class="logo" src="@/assets/images/logo.svg">
        <div class="form">
            <div class="input">
                <label>Email</label>
                <input type="text">
            </div>
            <div class="input">
                <label>Password</label>
                <input type="password">
            </div>
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
.login {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 100px;
}
.logo {
    max-width: 500px;
    margin-top: 15%;
}
.form {
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    font-size: 24px;
    width: 400px;
    padding: 10px 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
<template>
    <div class="fullsize">
        <div class="fullsize background"></div>
        <div class="login">
            <img class="logo" src="@/assets/images/BARLogoFull.png">
            <LoginForm />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "fade"
        }
    },
    setup() {
        const show = ref(true);
        return {show};
    }
});
</script>

<style scoped lang="scss">
.login {
    display: flex;
    flex-direction: column;
    gap: 80px;
    justify-content: center;
    max-width: 500px;
    align-items: center;
    margin-bottom: 100px;
}
</style>
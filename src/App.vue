<template>
    <Background />
    <NavBar />
    <div class="main">
        <Login />
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import NavBar from "@/components/NavBar.vue";
import Background from "@/components/Background.vue";
import Login from "@/components/Login.vue";

export default defineComponent({
    name: "App",
    components: {
        Background,
        NavBar,
        Login
    }
});
</script>

<style lang="scss" scoped>
.main {
    height: 100%;
    padding: 10px;
}
</style>

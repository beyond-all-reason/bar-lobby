<template>
    <Background />
    <NavBar />
    <div class="main">
        <!-- <router-link to="/">Home</router-link>
        <router-link to="/test">Page</router-link>
        <router-view></router-view> -->
        <router-link to="/">Index</router-link>
        <router-link to="/about">About</router-link>
        <router-view></router-view>
        <Login />
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import NavBar from "@/components/NavBar.vue";
import Background from "@/components/Background.vue";
import Login from "@/components/Login.vue";

export default defineComponent({
    components: {
        Background,
        NavBar,
        Login
    },
    setup() {
        return {};
    }
});
</script>

<style lang="scss" scoped>
.main {
    height: 100%;
    padding: 10px;
}
.hover {
    background: red;
    &:hover {
        background: blue;
    }
}
</style>
